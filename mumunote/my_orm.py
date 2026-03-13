import pymysql


class MyORM:
  def __init__(self):
    conn = pymysql.connect(host="localhost", user="root", password="123456", database="tomas",charset="utf8",cursorclass= pymysql.cursors.DictCursor)

    cursor=conn.cursor()

  def query(self):
    table_name='users'
    sql = "select * from %s" %(table_name)
  