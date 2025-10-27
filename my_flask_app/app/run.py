from flask import Flask, render_template
from app.management import products_bp 
from app.sales import sales_bp
from app.sales_report import sales_report_bp
app = Flask(
    __name__,
    template_folder="../templates",
    static_folder="../static"
)

# Register blueprints
app.register_blueprint(products_bp)
app.register_blueprint(sales_bp)
app.register_blueprint(sales_report_bp)
# Frontend routes
@app.route("/product-management.html")
def product_page():
    return render_template("product-management.html")

@app.route("/")
def home_page(): 
     return render_template("main.html")
 
@app.route("/checkout.html")
def checkout_page():
    return render_template("checkout.html")

@app.route("/sales-report.html")
def sales_report_page():
    return render_template("sales-report.html")

if __name__ == "__main__":
    app.run(debug=True)
