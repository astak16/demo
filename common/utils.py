import random
import string
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont


class ImageCode:
    def get_text(self):
        list = random.sample(string.ascii_letters + string.digits, 4)
        return "".join(list)

    def random_color(self):
        return random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)

    def draw_lines(self, draw, num, width, height):
        # for i in range(100):
        #     draw.point(
        #         (random.randint(0, width), random.randint(0, height)),
        #         fill=self.random_color(),
        #     )
        for i in range(num):
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            x2 = random.randint(0, width)
            y2 = random.randint(height, height)
            draw.line(((x1, y1), (x2, y2)), fill=self.random_color(), width=1)

    def draw_verify_code(self):
        code = self.get_text()
        width, height = 120, 50
        im = Image.new("RGB", (width, height), (255, 255, 255))
        font = ImageFont.truetype("/Library/Fonts/Arial Unicode.ttf", 40)
        draw = ImageDraw.Draw(im)
        for i in range(4):
            draw.text(
                (random.randint(3, 10) + 25 * i, random.randint(-3, 3)),
                text=code[i],
                fill=self.random_color(),
                font=font,
            )
        self.draw_lines(draw, 5, width, height)

        return im, code

    def get_code(self):
        image, code = self.draw_verify_code()
        buf = BytesIO()
        image.save(buf, "jpeg")
        image_b_string = buf.getvalue()
        return code, image_b_string
