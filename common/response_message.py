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
        return {"status": 2000, "message": "success", "data": data}

    @staticmethod
    def error(data):
        return {"status": 2002, "message": "error", "data": data}

    @staticmethod
    def other(data):
        return {"status": 2001, "message": "other", "data": data}


class FavoriteMessage:

    @staticmethod
    def success(data):
        return {"status": 3000, "message": "success", "data": data}

    @staticmethod
    def error(data):
        return {"status": 3002, "message": "error", "data": data}

    @staticmethod
    def other(data):
        return {"status": 3001, "message": "other", "data": data}


class FeedbackMessage:

    @staticmethod
    def success(data):
        return {"status": 4000, "message": "success", "data": data}

    @staticmethod
    def error(data):
        return {"status": 4002, "message": "error", "data": data}

    @staticmethod
    def other(data):
        return {"status": 4001, "message": "other", "data": data}
