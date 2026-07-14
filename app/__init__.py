from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_object=None):
    app = Flask(__name__)

    if config_object is None:
        from config import Config
        app.config.from_object(Config)
    else:
        app.config.from_object(config_object)

    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    from app.routes.dashboard import bp as dashboard_bp
    from app.routes.requests import bp as requests_bp
    from app.routes.approvals import bp as approvals_bp
    from app.routes.reports import bp as reports_bp

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(requests_bp)
    app.register_blueprint(approvals_bp)
    app.register_blueprint(reports_bp)

    # Template context: make `config` and `now` available everywhere
    @app.context_processor
    def inject_globals():
        from datetime import datetime, timezone
        return {"config": app.config, "now": datetime.now(timezone.utc)}

    # Start background scheduler (APScheduler)
    _start_scheduler(app)

    return app


def _start_scheduler(app):
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = BackgroundScheduler(daemon=True)

    def _weekly_report_job():
        with app.app_context():
            from app.services.report_service import generate_and_upload
            generate_and_upload()

    scheduler.add_job(
        _weekly_report_job,
        trigger=CronTrigger(
            day_of_week=app.config.get("REPORT_DAY_OF_WEEK", "mon"),
            hour=app.config.get("REPORT_HOUR", 7),
            minute=app.config.get("REPORT_MINUTE", 0),
        ),
        id="weekly_compliance_report",
        replace_existing=True,
    )
    scheduler.start()
