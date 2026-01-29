from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeamViewSet, ProjectViewSet, ProjectCommentViewSet, ProjectFileViewSet, ProjectCheckViewSet,
    StageViewSet, StageCommentViewSet, TaskViewSet,
    KnowledgeBaseViewSet, TeacherDashboardViewSet,
    KanbanCardViewSet, KanbanCardFileViewSet, KanbanCardCommentViewSet, KanbanCardCheckViewSet
)

router = DefaultRouter()
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'project-comments', ProjectCommentViewSet, basename='project-comment')
router.register(r'project-files', ProjectFileViewSet, basename='project-file')
router.register(r'project-checks', ProjectCheckViewSet, basename='project-check')
router.register(r'kanban-cards', KanbanCardViewSet, basename='kanban-card')
router.register(r'kanban-card-files', KanbanCardFileViewSet, basename='kanban-card-file')
router.register(r'kanban-card-comments', KanbanCardCommentViewSet, basename='kanban-card-comment')
router.register(r'kanban-card-checks', KanbanCardCheckViewSet, basename='kanban-card-check')
router.register(r'stages', StageViewSet, basename='stage')
router.register(r'stage-comments', StageCommentViewSet, basename='stage-comment')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'knowledge-base', KnowledgeBaseViewSet, basename='knowledge-base')
router.register(r'teacher-dashboard', TeacherDashboardViewSet, basename='teacher-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
