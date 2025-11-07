# Mom-and-Pop POS (SmartVision)

A small Point-of-Sale system for corner shops. It keeps product info, tracks stock, records sales, and shows simple reports—without the complexity or cost of big POS tools.

## What it does
- **Products:** create and edit product details (product code stays fixed)
- **Inventory:** set or adjust quantities; warn when stock is low
- **Sales:** checkout a basket, reduce stock, update revenue; if an item isn’t available, sell the rest and show an error
- **Reports:** view sales in a time range (grouped by customer with a total) and view current inventory (one product or all)

**Tech Used**
- Python 3
- Flask
- SQLite3
- HTML/CSS/JS

## Installation for cloning


## Windows Setup

Open PowerShell.

Check Python:
python --version

Create a virtual environment:
python -m venv venv

Activate the environment:
venv\Scripts\activate

Install dependencies:
pip install -r requirements.txt

Run the app:
cd my_flask_app
python run.py

## macOS Setup

Open Terminal.

Check Python:
python3 --version

Create a virtual environment:
python3 -m venv venv

Activate the environment:
source venv/bin/activate

Install dependencies:
pip install -r requirements.txt

Run the app:
cd my_flask_app
python run.py

## Linux Setup (Ubuntu / Debian / Fedora / Arch)

Open Terminal.

Check Python:
python3 --version

Install SQLite3 if needed:
Ubuntu / Debian:
sudo apt install sqlite3
Fedora:
sudo dnf install sqlite
Arch:
sudo pacman -S sqlite

Create a virtual environment:
python3 -m venv venv

Activate the environment:
source venv/bin/activate

Install dependencies:
pip install -r requirements.txt

Run the app:
cd my_flask_app
python run.py

## usage without cloning

## window
cd dist_window
./run

## Linux
cd dist_linux
chmod +x run
./run

## Mac
cd  dist_mac
open YourAppName.app
./YourAppName