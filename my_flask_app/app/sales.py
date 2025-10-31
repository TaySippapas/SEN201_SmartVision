"""
  File: sales.py
  Purpose: Manage sales operations for the POS — validation, stock checks,
           inventory updates, and transaction recording, including QR flow.
  Author: Jirat Kositchaiwat
  Last-Updated: 31 Oct 2025
"""

from flask import Blueprint, request, jsonify, send_file
from collections import defaultdict
from datetime import datetime
from typing import DefaultDict, Dict, Iterable, List, Tuple
from app.helper import get_connection
import base64, io, time
import qrcode

# ======================================================================
# Utility Functions
# ======================================================================

def combine_items(items: List[dict]) -> Tuple[Dict[int, int], dict | None]:
  combined: DefaultDict[int, int] = defaultdict(int)
  if not items or not isinstance(items, list):
    return {}, {"error": "invalid_input", "detail": "items must be a non-empty list"}

  for it in items:
    try:
      pid = int(it["product_id"])
      qty = int(it["quantity"])
    except (KeyError, ValueError, TypeError):
      return {}, {"error": "invalid_item", "detail": f"Bad item format: {it!r}"}
    if qty <= 0:
      return {}, {
        "error": "invalid_quantity",
        "detail": f"Quantity must be > 0 for product_id {it.get('product_id')}",
      }
    combined[pid] += qty
  return dict(combined), None


def fetch_products(cur, product_ids: Iterable[int]) -> Tuple[Dict[int, dict], dict | None]:
  placeholders = ",".join(["?"] * len(product_ids))
  cur.execute(
    f"""
      SELECT product_id, name, price, quantity, total_sales
      FROM product
      WHERE product_id IN ({placeholders})
    """,
    list(product_ids),
  )
  rows = cur.fetchall()
  prod_by_id = {int(r["product_id"]): r for r in rows}
  missing = [pid for pid in product_ids if pid not in prod_by_id]
  if missing:
    return {}, {"error": "product_not_found", "detail": f"missing product_ids: {missing}"}
  return prod_by_id, None


def check_stock(prod_by_id: Dict[int, dict], combined: Dict[int, int]) -> dict | None:
  for pid, need_qty in combined.items():
    have = int(prod_by_id[pid]["quantity"])
    if need_qty > have:
      name = prod_by_id[pid]["name"]
      return {
        "error": "not_enough_stock",
        "detail": f"product_id {pid} ('{name}'): have {have}, tried to sell {need_qty}",
      }
  return None


def calc_lines_and_total(prod_by_id: Dict[int, dict], combined: Dict[int, int]):
  line_summaries = []
  total_amount = 0.0
  for pid, qty in combined.items():
    unit_price = float(prod_by_id[pid]["price"])
    line_total = round(unit_price * qty, 2)
    total_amount += line_total
    line_summaries.append({
      "product_id": pid,
      "name": prod_by_id[pid]["name"],
      "unit_price": unit_price,
      "quantity": qty,
      "line_total": line_total,
    })
  return line_summaries, round(total_amount, 2)


def low_stock_warnings(prod_by_id: Dict[int, dict], combined: Dict[int, int], threshold: int) -> List[str]:
  warnings: List[str] = []
  for pid, qty in combined.items():
    remaining = int(prod_by_id[pid]["quantity"]) - qty
    if remaining <= threshold:
      name = prod_by_id[pid]["name"]
      warnings.append(f"⚠️ Stock for '{name}' is low ({remaining} left)")
  return warnings


# ======================================================================
# QR Helpers / In-memory TX status (replace with DB when ready)
# ======================================================================

# Track QR payment status in memory for now
# Structure: {transaction_id: {"status": "pending|paid|canceled|expired", "amount": float, "created": ts}}
TX_STATUS: Dict[int, dict] = {}

def _make_qr_png_b64(data: str) -> str:
  """Return a base64 PNG for the provided payload string."""
  img = qrcode.make(data)
  buf = io.BytesIO()
  img.save(buf, format="PNG")
  return base64.b64encode(buf.getvalue()).decode("ascii")

def _build_demo_qr_payload(txid: int, amount: float) -> str:
  """
  Replace this with a real EMVCo/PromptPay string later.
  For now, an opaque string unique per transaction is fine.
  """
  return f"PAYMENT|TX:{txid}|AMT:{amount:.2f}"


# ======================================================================
# Core Sales Logic
# ======================================================================

def sell_products(items: List[dict], payment_method: str = "cash", low_stock_threshold: int = 5) -> dict:
  """
  Sell multiple products in a single transaction.
  items: list of {product_id, quantity}
  payment_method: 'cash' | 'credit' | 'qr' | 'wallet'
  """
  combined, err = combine_items(items)
  if err:
    return err

  product_ids = list(combined.keys())
  conn = get_connection()

  try:
    cur = conn.cursor()

    prod_by_id, err = fetch_products(cur, product_ids)
    if err:
      return err

    err = check_stock(prod_by_id, combined)
    if err:
      return err

    line_summaries, total_amount = calc_lines_and_total(prod_by_id, combined)
    now_str = datetime.now().isoformat(timespec="seconds")

    # Insert transaction header
    cur.execute(
      """
      INSERT INTO total_transaction (total_amount, date_and_time, payment_method)
      VALUES (?, ?, ?)
      """,
      (total_amount, now_str, payment_method),
    )
    transaction_id = cur.lastrowid

    # Insert transaction lines
    for line in line_summaries:
      cur.execute(
        """
        INSERT INTO each_transaction (name, transaction_id, price, quantity)
        VALUES (?, ?, ?, ?)
        """,
        (line["name"], transaction_id, line["unit_price"], line["quantity"]),
      )

    # Update inventory (note: for real QR flow you may want to defer stock update until 'paid')
    for pid, qty in combined.items():
      cur.execute(
        """
        UPDATE product
        SET quantity = quantity - ?, total_sales = total_sales + ?
        WHERE product_id = ?
        """,
        (qty, qty, pid),
      )

    conn.commit()

    warnings = low_stock_warnings(prod_by_id, combined, low_stock_threshold)
    result = {
      "transaction_id": transaction_id,
      "items": line_summaries,
      "total_amount": float(total_amount),
      "payment_method": payment_method,
      "timestamp": now_str,
    }
    if warnings:
      result["warnings"] = warnings

    # === Attach QR data when payment method is QR ===
    if payment_method == "qr":
      # Mark this transaction as 'pending' in memory (swap to DB later)
      TX_STATUS[transaction_id] = {
        "status": "pending",
        "amount": float(total_amount),
        "created": time.time(),
      }
      # Build a payload and PNG QR for the frontend
      payload = _build_demo_qr_payload(transaction_id, float(total_amount))
      result["qr_payload"] = payload
      result["qr_png_base64"] = _make_qr_png_b64(payload)
      result["expires_in"] = 300  # 5 minutes

    return result

  except (RuntimeError, ValueError, OSError) as exc:
    conn.rollback()
    return {"error": "db_error", "detail": str(exc)}
  finally:
    conn.close()


# ======================================================================
# Flask Blueprint
# ======================================================================

sales_bp = Blueprint("sales", __name__, url_prefix="/api/sales")

@sales_bp.post("/checkout")
def checkout_sale():
  """
  Process a checkout transaction with a specified payment method.
  Request JSON:
    { "items": [...], "payment_method": "cash"|"credit"|"qr"|"wallet" }
  """
  data = request.get_json(force=True)
  if not data or "items" not in data:
    return jsonify({"error": "missing_items", "detail": "Missing 'items' field"}), 400

  payment_method = (data.get("payment_method") or "cash").lower()
  allowed = {"cash", "credit", "qr", "wallet"}
  if payment_method not in allowed:
    return jsonify({
      "error": "invalid_payment_method",
      "detail": f"Use one of: {sorted(allowed)}"
    }), 400

  result = sell_products(data["items"], payment_method)
  if "error" in result:
    return jsonify(result), 400

  return jsonify(result), 200


@sales_bp.get("/product/<int:product_id>")
def get_product(product_id: int):
  conn = get_connection()
  cur = conn.cursor()
  cur.execute(
    """
    SELECT product_id, name, price, quantity
    FROM product
    WHERE product_id = ?
    """,
    (product_id,),
  )
  row = cur.fetchone()
  conn.close()

  if not row:
    return jsonify({"error": "not_found", "detail": "Product not found"}), 404

  return jsonify(dict(row)), 200


@sales_bp.get("/search")
def search_products():
  """
  Search products by name prefix (case-insensitive).
  Used by the checkout page for autocomplete.
  """
  q = (request.args.get("q") or "").strip()
  if not q:
    return jsonify([]), 200

  conn = get_connection()
  cur = conn.cursor()
  cur.execute(
    """
    SELECT product_id, name, price, quantity
    FROM product
    WHERE name LIKE ? COLLATE NOCASE
    ORDER BY name
    LIMIT 10
    """,
    (f"{q}%",),
  )
  rows = cur.fetchall()
  conn.close()

  def row_to_dict(r):
    try:
      return {
        "product_id": int(r["product_id"]),
        "name": r["name"],
        "price": float(r["price"]),
        "quantity": int(r["quantity"]),
      }
    except (TypeError, KeyError):
      return {
        "product_id": int(r[0]),
        "name": r[1],
        "price": float(r[2]),
        "quantity": int(r[3]),
      }

  return jsonify([row_to_dict(r) for r in rows]), 200


# ======================================================================
# QR Status / Control Endpoints
# ======================================================================

@sales_bp.get("/status/<int:transaction_id>")
def qr_status(transaction_id: int):
  """
  Poll current status of a QR transaction.
  Auto-expires after 5 minutes if still pending.
  """
  tx = TX_STATUS.get(transaction_id)
  if not tx:
    # If not in memory, treat as unknown (or consult DB if you add a status column there).
    return jsonify({"status": "unknown"}), 200

  # Auto-expire after 5 minutes
  if tx["status"] == "pending" and (time.time() - tx["created"] > 300):
    tx["status"] = "expired"
  return jsonify({"status": tx["status"], "amount": tx["amount"]}), 200


@sales_bp.post("/mark-paid/<int:transaction_id>")
def qr_mark_paid(transaction_id: int):
  """
  Manual test endpoint: mark a QR transaction as paid.
  In production, this would be triggered by your payment gateway webhook.
  """
  tx = TX_STATUS.get(transaction_id)
  if not tx:
    # If it's not tracked in memory, you might verify via DB instead.
    TX_STATUS[transaction_id] = {"status": "paid", "amount": 0.0, "created": time.time()}
  else:
    tx["status"] = "paid"
  return jsonify({"ok": True}), 200


@sales_bp.get("/qr.png")
def qr_png():
  """
  Optional helper: render a QR PNG from a text payload.
  Frontend uses this only if it didn't receive qr_png_base64 directly.
  """
  data = (request.args.get("data") or "").strip()
  if not data:
    return jsonify({"error": "no_data"}), 400
  img = qrcode.make(data)
  buf = io.BytesIO()
  img.save(buf, format="PNG")
  buf.seek(0)
  return send_file(buf, mimetype="image/png")
