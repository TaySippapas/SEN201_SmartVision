from flask import Blueprint, request, jsonify
from app.helper import get_connection

sales_report_bp = Blueprint('sales_report', __name__, url_prefix='/sales-report')

def query_sales_report(start_date=None, end_date=None, group_by='daily'):
    """
    Return total revenue and quantity sold per period (day/week/month).
    """
    conn = get_connection()
    cur = conn.cursor()

    # Base SQL: join each_transaction with total_transaction
    sql = """
    SELECT 
        date(datetime(tt.date_and_time)) AS period,
        SUM(tt.total_amount) AS total_amount,
        SUM(et.quantity) AS total_quantity
    FROM each_transaction et
    JOIN total_transaction tt ON et.transaction_id = tt.transaction_id
    WHERE 1=1
    """
    params = []

    # Date filters
    if start_date:
        sql += " AND date(datetime(tt.date_and_time)) >= date(?)"
        params.append(start_date)
    if end_date:
        sql += " AND date(datetime(tt.date_and_time)) <= date(?)"
        params.append(end_date)

    # Grouping
    if group_by == 'daily':
        sql += " GROUP BY date(datetime(tt.date_and_time)) ORDER BY date(datetime(tt.date_and_time)) ASC"
    elif group_by == 'weekly':
        sql = """
        SELECT strftime('%Y-W%W', datetime(tt.date_and_time)) AS period,
               SUM(tt.total_amount) AS total_amount,
               SUM(et.quantity) AS total_quantity
        FROM each_transaction et
        JOIN total_transaction tt ON et.transaction_id = tt.transaction_id
        WHERE 1=1
        """
        if start_date:
            sql += " AND date(datetime(tt.date_and_time)) >= date(?)"
        if end_date:
            sql += " AND date(datetime(tt.date_and_time)) <= date(?)"
        sql += " GROUP BY strftime('%Y-W%W', datetime(tt.date_and_time)) ORDER BY strftime('%Y-W%W', datetime(tt.date_and_time)) ASC"
    elif group_by == 'monthly':
        sql = """
        SELECT strftime('%Y-%m', datetime(tt.date_and_time)) AS period,
               SUM(tt.total_amount) AS total_amount,
               SUM(et.quantity) AS total_quantity
        FROM each_transaction et
        JOIN total_transaction tt ON et.transaction_id = tt.transaction_id
        WHERE 1=1
        """
        if start_date:
            sql += " AND date(datetime(tt.date_and_time)) >= date(?)"
        if end_date:
            sql += " AND date(datetime(tt.date_and_time)) <= date(?)"
        sql += " GROUP BY strftime('%Y-%m', datetime(tt.date_and_time)) ORDER BY strftime('%Y-%m', datetime(tt.date_and_time)) ASC"

    cur.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    return rows

@sales_report_bp.route('/report-json')
def sales_report_json():
    start_date = request.args.get('from')
    end_date = request.args.get('to')
    group_by = request.args.get('group', 'daily')
    rows = query_sales_report(start_date, end_date, group_by)
    result = [
        {
            'period': r['period'],
            'total_amount': r['total_amount'],
            'total_quantity': r['total_quantity']
        } for r in rows
    ]
    return jsonify(result)
