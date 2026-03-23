from flask import Flask
from app import create_app
from helper import is_isbn_or_key
from yushu_book import YuShuBook

app = create_app()

if __name__ == "__main__":
    app.run(port=5003, debug=app.config["DEBUG"])
