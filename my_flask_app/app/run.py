# test_sell.py
from app.management import create_product  # your existing create function
from app.sales import sell_product         # your new sell function
from my_flask_app.app.helper import get_connection


def show_products():
    """Helper to display all products from DB."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM product")
        rows = cur.fetchall()
        print("\n📦 Current Products:")
        for row in rows:
            print(dict(row))


def main():
    # 1️⃣ Create sample products
    p1 = create_product("Coca Cola", "Refreshing soda", 1.5, 50)
    p2 = create_product("Pepsi", "Cola drink", 1.4, 30)
    p3 = create_product("Fanta", "Orange soda", 1.2, 20)

    print("✅ Products created:")
    print(p1)
    print(p2)
    print(p3)

    show_products()

    # 2️⃣ Sell one product (simulate transaction)
    print("\n🛒 Selling some products...")
    result1 = sell_product(product_id=p1["product_id"], quantity_sold=5, payment_method="cash")
    print("Result 1:", result1)

    result2 = sell_product(product_id=p3["product_id"], quantity_sold=18, payment_method="credit")
    print("Result 2:", result2)

    # 3️⃣ Show updated product table
    show_products()


if __name__ == "__main__":
    main()

