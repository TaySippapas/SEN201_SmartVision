from flask import Flask, send_from_directory
from pathlib import Path
from app.api_products import bp as products_api

def create_app(testing: bool = False):
    app = Flask(__name__)  # we'll serve files manually
    app.config["TESTING"] = testing
    app.register_blueprint(products_api)

    # ---- UI routes (serve your existing HTML/CSS/JS) ----
    UI_DIR = Path(__file__).resolve().parents[1] / "ui"

    @app.get("/")
    def home():
        return send_from_directory(UI_DIR, "main.html")

    @app.get("/inventory")
    def inventory():
        return send_from_directory(UI_DIR, "product-management.html")

    @app.get("/ui/<path:fname>")
    def ui_assets(fname):
        return send_from_directory(UI_DIR, fname)
    
    @app.get("/ping")
    def ping():
        return {"ok": True}

    return app