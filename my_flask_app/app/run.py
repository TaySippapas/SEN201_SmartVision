from app import app
from app.management import create_product,modify_product,delete_product

if __name__ == "__main__":
    # Test inserting a product directly
    
    updated = modify_product(
        product_id=2,
        price=2.0,
        quantity=100
    )
    print("Update result:", updated)

    # 3️⃣ Delete product
    deleted = delete_product(2)
    print("Delete result:", deleted)

    # Start Flask server (no reloader to avoid double execution)
    app.run(debug=True, use_reloader=False)
