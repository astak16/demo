from flask import Flask as _Flask
from flask.json.provider import DefaultJSONProvider


__author__ = "uccs"


class GingerJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if hasattr(o, "keys") and hasattr(o, "__getitem__"):
            return dict(o)
        return super().default(o)


class Flask(_Flask):
    json_provider_class = GingerJSONProvider
