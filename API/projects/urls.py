from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, DevelopmentStageViewSet, StageCommentViewSet,
    StageHintViewSet
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'stages', DevelopmentStageViewSet, basename='stage')
router.register(r'comments', StageCommentViewSet, basename='comment')
router.register(r'hints', StageHintViewSet, basename='hint')

urlpatterns = [
    path('', include(router.urls)),
]



