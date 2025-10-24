from flask import Flask, render_template
from app.management import products_bp 
from app.sales import sales_bp

app = Flask(
    __name__,
    template_folder="../templates",  # relative path to templates
    static_folder="../static"        # optional if your static folder is outside
)
app.register_blueprint(products_bp)

app.register_blueprint(sales_bp)

# Frontend route
@app.route("/product-management.html")
def product_page():
    """Render the product management HTML page."""
    return render_template("product-management.html")

@app.route("/")
def home_page(): 
     return render_template("main.html")
 
@app.route("/checkout.html")
def checkout_page():
    """Render the checkout HTML page."""
    return render_template("checkout.html")

if __name__ == "__main__":
    app.run(debug=True)
