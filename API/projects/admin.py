from django.contrib import admin
from .models import Project, ProjectMember, DevelopmentStage, StageComment, ProjectChatMessage, StageHint


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description', 'owner__email']
    filter_horizontal = ['members']


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'role', 'joined_at']
    list_filter = ['role', 'joined_at']
    search_fields = ['project__name', 'user__email']


@admin.register(DevelopmentStage)
class DevelopmentStageAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'stage_type', 'is_completed', 'order']
    list_filter = ['stage_type', 'is_completed', 'created_at']
    search_fields = ['name', 'description', 'project__name']


@admin.register(StageComment)
class StageCommentAdmin(admin.ModelAdmin):
    list_display = ['stage', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text', 'author__email', 'stage__name']


@admin.register(ProjectChatMessage)
class ProjectChatMessageAdmin(admin.ModelAdmin):
    list_display = ['project', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text', 'author__email', 'project__name']


@admin.register(StageHint)
class StageHintAdmin(admin.ModelAdmin):
    list_display = ['title', 'stage', 'order']
    list_filter = ['created_at']
    search_fields = ['title', 'content', 'stage__name']



