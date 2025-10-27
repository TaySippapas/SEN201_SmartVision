from flask import Blueprint, request, jsonify
from app.helper import get_connection

sales_report_bp = Blueprint('sales_report', __name__, url_prefix='/sales-report')


def query_sales_report(start_date=None, end_date=None, group_by='daily'):
    """Return total revenue and quantity sold per period (day/week/month)."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        sql = """
        SELECT 
            date(tt.date_and_time) AS period,
            SUM(tt.total_amount) AS total_amount,
            SUM(et.quantity) AS total_quantity
        FROM each_transaction et
        JOIN total_transaction tt ON et.transaction_id = tt.transaction_id
        WHERE 1=1
        """
        params = []

        # Date filters
        if start_date:
            sql += " AND date(tt.date_and_time) >= date(?)"
            params.append(start_date)
        if end_date:
            sql += " AND date(tt.date_and_time) <= date(?)"
            params.append(end_date)

        # Grouping
        if group_by == 'daily':
            sql += " GROUP BY date(tt.date_and_time) ORDER BY date(tt.date_and_time) ASC"
        elif group_by == 'weekly':
            sql += " GROUP BY strftime('%Y-W%W', tt.date_and_time) ORDER BY strftime('%Y-W%W', tt.date_and_time) ASC"
        elif group_by == 'monthly':
            sql += " GROUP BY strftime('%Y-%m', tt.date_and_time) ORDER BY strftime('%Y-%m', tt.date_and_time) ASC"

        cur.execute(sql, params)
        rows = cur.fetchall()
        conn.close()
        return rows

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return []


@sales_report_bp.route('/report-json')
def sales_report_json():
    start_date = request.args.get('from')
    end_date = request.args.get('to')
    group_by = request.args.get('group', 'daily')

    rows = query_sales_report(start_date, end_date, group_by)
    result = [
        {
            'period': r['period'],
            'total_amount': r['total_amount'] or 0,
            'total_quantity': r['total_quantity'] or 0
        } for r in rows
    ]
    return jsonify(result)



