from flask import Flask, render_template
from app.management import products_bp  # import the Blueprint

app = Flask(
    __name__,
    template_folder="../templates",  # relative path to templates
    static_folder="../static"        # optional if your static folder is outside
)
app.register_blueprint(products_bp)

# Frontend route
@app.route("/product-management.html")
def product_page():
    """Render the product management HTML page."""
    return render_template("product-management.html")
@app.route("/")
def home_page():
     return render_template("main.html")
if __name__ == "__main__":
    app.run(debug=True)
