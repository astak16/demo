class Redprint:

    def __init__(self, name):
        self.name = name
        self.mound = []

    def route(self, rule, **options):
        def decorator(f):
            self.mound.append((f, rule, options))
            return f

        return decorator

    def register(self, bp, url_prefix=None):
        for f, rule, options in self.mound:
            endpoint = self.name + "+" + options.pop("endpoint", f.__name__)
            if url_prefix is None:
                url_prefix = "/" + self.name
            rule = url_prefix + rule
            bp.add_url_rule(rule, endpoint, f, **options)
