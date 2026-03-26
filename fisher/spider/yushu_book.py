from flask import current_app


class YuShuBook:
    def __init__(self):
        self.total = 0
        self.books = []

    def search_by_isbn(self, isbn):
        result = {
            "total": 1,
            "books": [{"id": "9787501524044", "title": "Java 编程：从入门到实践"}],
        }
        self.__fill_single(result)

    def __fill_single(self, data):
        if data:
            self.total = 1
            self.books.append(data)

    def __fill_collection(self, data):
        self.total = data["total"]
        self.books = data["books"]

    def search_by_keyword(self, keyword, page=1):
        # per_page = current_app.config["PER_PAGE"]
        self.calculate_start(page)
        result = {
            "total": 1,
            "books": [{"id": "9787501524044", "title": "Python 编程：从入门到实践"}],
        }
        self.__fill_collection(result)

    def calculate_start(self, page):
        per_page = current_app.config["PER_PAGE"]
        return (page - 1) * per_page
