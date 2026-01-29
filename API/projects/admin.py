from django.contrib import admin
from .models import (
    Team, TeamMember, Project, ProjectComment, ProjectFile, ProjectCheck,
    Stage, StageComment, Task, KnowledgeBase,
    KanbanCard, KanbanCardFile, KanbanCardComment, KanbanCardCheck
)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'created_by__email']


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ['team', 'user', 'role', 'is_confirmed', 'joined_at']
    list_filter = ['role', 'is_confirmed', 'joined_at']
    search_fields = ['team__name', 'user__email']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'team', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'passport', 'team__name', 'created_by__email']
    readonly_fields = ['submitted_at', 'reviewed_at']


@admin.register(ProjectComment)
class ProjectCommentAdmin(admin.ModelAdmin):
    list_display = ['project', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text', 'author__email', 'project__name']


@admin.register(ProjectFile)
class ProjectFileAdmin(admin.ModelAdmin):
    list_display = ['project', 'name', 'uploaded_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'project__name', 'uploaded_by__email']


@admin.register(ProjectCheck)
class ProjectCheckAdmin(admin.ModelAdmin):
    list_display = ['project', 'teacher', 'is_checked', 'updated_at']
    list_filter = ['is_checked', 'updated_at']
    search_fields = ['project__name', 'teacher__email', 'comment']


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'status', 'order', 'deadline']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'description', 'project__name']
    readonly_fields = ['submitted_at', 'reviewed_at']


@admin.register(StageComment)
class StageCommentAdmin(admin.ModelAdmin):
    list_display = ['stage', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text', 'author__email', 'stage__name']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['name', 'stage', 'assigned_to', 'status', 'deadline']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'description', 'stage__name', 'assigned_to__email']
    readonly_fields = ['completed_at']


@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ['title', 'section', 'order', 'created_at']
    list_filter = ['section', 'created_at']
    search_fields = ['title', 'content']


@admin.register(KanbanCard)
class KanbanCardAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'column', 'order', 'created_by', 'created_at']
    list_filter = ['column', 'created_at']
    search_fields = ['title', 'description', 'project__name']


@admin.register(KanbanCardFile)
class KanbanCardFileAdmin(admin.ModelAdmin):
    list_display = ['card', 'name', 'uploaded_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'card__title']


@admin.register(KanbanCardComment)
class KanbanCardCommentAdmin(admin.ModelAdmin):
    list_display = ['card', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text', 'author__email', 'card__title']


@admin.register(KanbanCardCheck)
class KanbanCardCheckAdmin(admin.ModelAdmin):
    list_display = ['card', 'teacher', 'is_checked', 'updated_at']
    list_filter = ['is_checked', 'updated_at']
    search_fields = ['card__title', 'teacher__email', 'comment']
