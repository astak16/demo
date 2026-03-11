class UserMessage:

    @staticmethod
    def success(data):
        return {"status": 1000, "message": "success", "data": data}

    @staticmethod
    def error(data):
        return {"status": 1002, "message": "error", "data": data}

    @staticmethod
    def other(data):
        return {"status": 1001, "message": "other", "data": data}


class ArticleMessage:

    @staticmethod
    def success(data):
        return {"status": 1000, "message": "success", "data": data}

    @staticmethod
    def error(data):
        return {"status": 1002, "message": "error", "data": data}

    @staticmethod
    def other(data):
        return {"status": 1001, "message": "other", "data": data}
