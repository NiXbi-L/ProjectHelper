# Generated manually to migrate from old models to new structure

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
from django.conf import settings


def remove_old_tables(apps, schema_editor):
    """Remove old tables (if they exist)"""
    # Используем IF EXISTS, чтобы не было ошибок, если таблицы не существуют
    # Это безопасно для пустой базы данных
    try:
        schema_editor.execute("DROP TABLE IF EXISTS projects_stagehint CASCADE;")
        schema_editor.execute("DROP TABLE IF EXISTS projects_projectchatmessage CASCADE;")
        schema_editor.execute("DROP TABLE IF EXISTS projects_stagecomment CASCADE;")
        schema_editor.execute("DROP TABLE IF EXISTS projects_developmentstage CASCADE;")
        schema_editor.execute("DROP TABLE IF EXISTS projects_projectmember CASCADE;")
        schema_editor.execute("DROP TABLE IF EXISTS projects_project CASCADE;")
    except Exception:
        # Игнорируем ошибки, если таблицы не существуют (база данных пустая)
        pass


def create_new_tables(apps, schema_editor):
    """Create new tables"""
    # Tables will be created automatically through CreateModel operations
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('contenttypes', '0001_initial'),  # Зависимость от contenttypes для работы с пустой БД
        # Зависимость от 0003 условная - если база пустая, миграция 0003 может не применяться
        # Но Django все равно попытается применить её, если она есть в истории
        ('projects', '0003_alter_projectchatmessage_options'),
    ]

    operations = [
        # Remove old tables
        migrations.RunPython(remove_old_tables, migrations.RunPython.noop),
        
        # Create new models
        migrations.CreateModel(
            name='Team',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, validators=[django.core.validators.MinLengthValidator(3)], verbose_name='Team name')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated at')),
                ('is_active', models.BooleanField(default=True, verbose_name='Active')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_teams', to=settings.AUTH_USER_MODEL, verbose_name='Creator')),
            ],
            options={
                'verbose_name': 'Team',
                'verbose_name_plural': 'Teams',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='TeamMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('team_leader', 'Team Leader'), ('member', 'Member')], default='member', max_length=20, verbose_name='Role')),
                ('is_confirmed', models.BooleanField(default=False, verbose_name='Confirmed')),
                ('joined_at', models.DateTimeField(blank=True, null=True, verbose_name='Joined at')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('invited_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invited_members', to=settings.AUTH_USER_MODEL, verbose_name='Invited by')),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='team_members', to='projects.team', verbose_name='Team')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='team_memberships', to=settings.AUTH_USER_MODEL, verbose_name='User')),
            ],
            options={
                'verbose_name': 'Team Member',
                'verbose_name_plural': 'Team Members',
                'ordering': ['-created_at'],
                'unique_together': {('team', 'user')},
            },
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, validators=[django.core.validators.MinLengthValidator(3)], verbose_name='Project name')),
                ('passport', models.TextField(blank=True, verbose_name='Project passport')),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('submitted', 'Submitted'), ('approved', 'Approved'), ('revision', 'Revision'), ('rejected', 'Rejected')], default='draft', max_length=20, verbose_name='Status')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated at')),
                ('submitted_at', models.DateTimeField(blank=True, null=True, verbose_name='Submitted at')),
                ('reviewed_at', models.DateTimeField(blank=True, null=True, verbose_name='Reviewed at')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_projects', to=settings.AUTH_USER_MODEL, verbose_name='Creator')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_projects', to=settings.AUTH_USER_MODEL, verbose_name='Reviewed by')),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='projects', to='projects.team', verbose_name='Team')),
            ],
            options={
                'verbose_name': 'Project',
                'verbose_name_plural': 'Projects',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProjectComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(verbose_name='Comment text')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated at')),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='project_comments', to=settings.AUTH_USER_MODEL, verbose_name='Author')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='projects.project', verbose_name='Project')),
            ],
            options={
                'verbose_name': 'Project Comment',
                'verbose_name_plural': 'Project Comments',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Stage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, verbose_name='Stage name')),
                ('description', models.TextField(blank=True, verbose_name='Description')),
                ('criteria', models.TextField(blank=True, verbose_name='Criteria')),
                ('artifact', models.FileField(blank=True, null=True, upload_to='artifacts/', verbose_name='Artifact')),
                ('artifact_description', models.TextField(blank=True, verbose_name='Artifact description')),
                ('deadline', models.DateTimeField(blank=True, null=True, verbose_name='Deadline')),
                ('status', models.CharField(choices=[('in_progress', 'In Progress'), ('submitted', 'Submitted'), ('approved', 'Approved'), ('revision', 'Revision')], default='in_progress', max_length=20, verbose_name='Status')),
                ('order', models.IntegerField(default=0, verbose_name='Order')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated at')),
                ('submitted_at', models.DateTimeField(blank=True, null=True, verbose_name='Submitted at')),
                ('reviewed_at', models.DateTimeField(blank=True, null=True, verbose_name='Reviewed at')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stages', to='projects.project', verbose_name='Project')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_stages', to=settings.AUTH_USER_MODEL, verbose_name='Reviewed by')),
            ],
            options={
                'verbose_name': 'Stage',
                'verbose_name_plural': 'Stages',
                'ordering': ['order', 'created_at'],
            },
        ),
        migrations.CreateModel(
            name='StageComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(verbose_name='Comment text')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated at')),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stage_comments', to=settings.AUTH_USER_MODEL, verbose_name='Author')),
                ('stage', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='projects.stage', verbose_name='Stage')),
            ],
            options={
                'verbose_name': 'Stage Comment',
                'verbose_name_plural': 'Stage Comments',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Task',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, verbose_name='Task name')),
                ('description', models.TextField(blank=True, verbose_name='Description')),
                ('deadline', models.DateTimeField(blank=True, null=True, verbose_name='Deadline')),
                ('status', models.CharField(choices=[('new', 'New'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('returned', 'Returned')], default='new', max_length=20, verbose_name='Status')),
                ('blocker', models.TextField(blank=True, verbose_name='Blocker')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated at')),
                ('completed_at', models.DateTimeField(blank=True, null=True, verbose_name='Completed at')),
                ('assigned_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_tasks', to=settings.AUTH_USER_MODEL, verbose_name='Assigned by')),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_tasks', to=settings.AUTH_USER_MODEL, verbose_name='Assigned to')),
                ('stage', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tasks', to='projects.stage', verbose_name='Stage')),
            ],
            options={
                'verbose_name': 'Task',
                'verbose_name_plural': 'Tasks',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='KnowledgeBase',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('section', models.CharField(choices=[('team', 'Team'), ('project_passport', 'Project Passport'), ('stage', 'Stage'), ('task', 'Task')], max_length=50, verbose_name='Section')),
                ('title', models.CharField(max_length=200, verbose_name='Title')),
                ('content', models.TextField(verbose_name='Content')),
                ('order', models.IntegerField(default=0, verbose_name='Order')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated at')),
            ],
            options={
                'verbose_name': 'Knowledge Base',
                'verbose_name_plural': 'Knowledge Base',
                'ordering': ['section', 'order', 'created_at'],
            },
        ),
    ]
