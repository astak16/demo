from flask import current_app


class YuShuBook:
    @classmethod
    def search_by_isbn(cls, isbn):
        return {
            "total": 1,
            "books": [{"id": "9787501524044", "title": "Java 编程：从入门到实践"}],
        }

    @classmethod
    def search_by_keyword(cls, keyword, page=1):
        # per_page = current_app.config["PER_PAGE"]
        cls.calculate_start(page)
        return {
            "total": 1,
            "books": [{"id": "9787501524044", "title": "Python 编程：从入门到实践"}],
        }

    @staticmethod
    def calculate_start(page):
        per_page = current_app.config["PER_PAGE"]
        return (page - 1) * per_page
