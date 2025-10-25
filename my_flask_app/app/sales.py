"""
  File: sales.py
  Purpose: Manage sales operations for the POS — validation, stock checks,
           inventory updates, and transaction recording.
  Author: SmartVision Team
  Last-Updated: 25 Oct 2025
"""

from flask import Blueprint, request, jsonify
from collections import defaultdict
from datetime import datetime
from typing import DefaultDict, Dict, Iterable, List, Tuple
from app.helper import get_connection

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
        INSERT INTO each_transaction (transaction_id, product_id, quantity)
        VALUES (?, ?, ?)
        """,
        (transaction_id, line["product_id"], line["quantity"]),
      )

    # Update inventory
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
      "total_amount": total_amount,
      "payment_method": payment_method,
      "timestamp": now_str,
    }
    if warnings:
      result["warnings"] = warnings

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
