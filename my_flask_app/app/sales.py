from app.storage import get_connection
from datetime import datetime            
from collections import defaultdict             

def sell_products(items, payment_method: str = "cash", low_stock_threshold: int = 5):

    if not items or not isinstance(items, list):               # make sure 'items' is a non-empty list
        return {"error": "invalid_input", "detail": "items must be a non-empty list"}

    combined = defaultdict(int)                                # a dict that defaults numbers to 0
    for it in items:                                           
        try:
            pid = int(it["product_id"])
            qty = int(it["quantity"])                       
        except (KeyError, ValueError, TypeError):              
            return {"error": "invalid_item", "detail": f"Bad item format: {it!r}"}
        if qty <= 0:                                           # quantity must be positive
            return {"error": "invalid_quantity", "detail": f"Quantity must be > 0 for product_id {pid}"}
        combined[pid] += qty                                  

    product_ids = list(combined.keys())                        # list of unique product IDs in this sale

    # Open DB and fetch all products in one query 

    conn = get_connection()                                    # open database connection
    try:
        cur = conn.cursor()                                    # create a cursor to run SQL

        placeholders = ",".join(["?"] * len(product_ids))      # make "?, ?, ?" to match number of IDs
        cur.execute(                                           # fetch product rows for all IDs at once
            f"""
            SELECT product_id, name, price, quantity, total_sales
            FROM product
            WHERE product_id IN ({placeholders})
            """,
            product_ids
        )
        rows = cur.fetchall()                                  # get all matching rows

        prod_by_id = {int(r["product_id"]): r for r in rows}   # map rows by product_id for quick lookup
        missing = [pid for pid in product_ids if pid not in prod_by_id]   # any id not found?
        if missing:                                            # if a product is missing, stop early
            return {"error": "product_not_found", "detail": f"missing product_ids: {missing}"}

        # Check stock for every item (all-or-nothing) 

        for pid, need_qty in combined.items():                 # for each requested product
            have = int(prod_by_id[pid]["quantity"])            # current stock from DB
            if need_qty > have:                                # not enough stock?
                return {
                    "error": "not_enough_stock",
                    "detail": f"product_id {pid} ('{prod_by_id[pid]['name']}'): have {have}, tried to sell {need_qty}"
                }

        # Compute line totals and overall total

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
        total_amount = round(total_amount, 2)                   
        now_str = datetime.now().isoformat(timespec="seconds")  

        # Insert receipt header

        cur.execute(
            """
            INSERT INTO total_transaction (total_amount, date_and_time, payment_method)
            VALUES (?, ?, ?)
            """,
            (total_amount, now_str, payment_method)
        )
        transaction_id = cur.lastrowid                          # remember the new receipt id

        # Insert receipt lines

        for line in line_summaries:                             # one row per product line
            cur.execute(
                """
                INSERT INTO each_transaction (transaction_id, product_id, quantity)
                VALUES (?, ?, ?)
                """,
                (transaction_id, line["product_id"], line["quantity"])
            )

        # Update inventory counts for every product 

        for pid, qty in combined.items():                       # reduce stock, increase total_sales
            cur.execute(
                """
                UPDATE product
                SET quantity = quantity - ?, total_sales = total_sales + ?
                WHERE product_id = ?
                """,
                (qty, qty, pid)
            )

        conn.commit()                                           # save all changes together (atomic)

        # uild response and add any low-stock warnings

        warnings = []
        for pid, qty in combined.items():
            remaining = int(prod_by_id[pid]["quantity"]) - qty  # compute new remaining stock
            if remaining <= low_stock_threshold:                # if below threshold, warn
                warnings.append(
                    f"⚠️ Stock for '{prod_by_id[pid]['name']}' is low ({remaining} left)"
                )

        return {                                                # final success payload
            "transaction_id": transaction_id,
            "items": line_summaries,
            "total_amount": total_amount,
            "payment_method": payment_method,
            "timestamp": now_str,
            **({"warnings": warnings} if warnings else {})    
        }

    except Exception as e:                                      # if anything fails anywhere above
        conn.rollback()                                         # undo all partial changes
        return {"error": "db_error", "detail": str(e)}          # report the problem
    finally:
        conn.close()                                          
