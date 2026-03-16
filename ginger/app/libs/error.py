from flask import request, json
from werkzeug.exceptions import HTTPException


class APIException(HTTPException):
    code = 500
    msg = "Sorry, an internal error occurred."
    error_code = 999

    def __init__(self, msg=None, code=None, error_code=None, headers=None):
        if msg is not None:
            self.msg = msg
        if error_code is not None:
            self.error_code = error_code
        if code is not None:
            self.code = code
        if headers is not None:
            self.headers = headers
        super(APIException, self).__init__(self.msg, None)

    def get_body(self, environ=None, scope=None) -> str:
        body = dict(
            msg=self.msg,
            error_code=self.error_code,
            request=request.method + " " + self.get_url_no_param(),
        )
        return json.dumps(body)

    def get_headers(self, environ=None, scope=None):
        return [("Content-Type", "application/json")]

    @staticmethod
    def get_url_no_param():
        full_path = str(request.full_path)
        return full_path.split("?")[0]
