from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Project, ProjectMember, DevelopmentStage, StageComment, StageHint
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer, ProjectMemberSerializer,
    DevelopmentStageSerializer, StageCommentSerializer, StageHintSerializer
)
from .permissions import IsProjectOwnerOrMember, IsProjectOwner

User = get_user_model()


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с проектами"""
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает проекты, где пользователь владелец или участник"""
        user = self.request.user
        return Project.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        """При создании проекта устанавливаем владельца"""
        project = serializer.save(owner=self.request.user)
        # Автоматически добавляем владельца как участника
        ProjectMember.objects.get_or_create(
            project=project,
            user=self.request.user,
            defaults={'role': 'owner'}
        )
        # Создаем стандартные этапы проекта
        from .services import create_default_stages
        create_default_stages(project)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_member(self, request, pk=None):
        """Добавить участника в проект по email"""
        project = self.get_object()
        
        # Проверяем, что пользователь - владелец проекта
        if project.owner != request.user:
            return Response(
                {'error': 'Только владелец проекта может добавлять участников'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': 'Email обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем формат email
        if not email.endswith('@dvfu.ru'):
            return Response(
                {'error': 'Email должен быть в формате @dvfu.ru'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь с таким email не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверяем, не является ли пользователь уже участником
        if project.members.filter(id=user.id).exists():
            return Response(
                {'error': 'Пользователь уже является участником проекта'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Добавляем участника
        ProjectMember.objects.create(
            project=project,
            user=user,
            role='member'
        )
        
        serializer = ProjectMemberSerializer(ProjectMember.objects.get(project=project, user=user))
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, IsProjectOwnerOrMember])
    def enter(self, request, pk=None):
        """Вход в проект - возвращает детальную информацию"""
        project = self.get_object()
        
        # Если этапов нет, создаем их (для старых проектов)
        if not project.stages.exists():
            from .services import create_default_stages
            create_default_stages(project)
        
        # Оптимизируем запрос - загружаем этапы с подсказками одним запросом
        project = Project.objects.prefetch_related(
            'stages__hints',
            'stages__comments'
        ).get(id=project.id)
        serializer = ProjectDetailSerializer(project, context={'request': request})
        return Response(serializer.data)


class DevelopmentStageViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с этапами разработки"""
    serializer_class = DevelopmentStageSerializer
    permission_classes = [IsAuthenticated, IsProjectOwnerOrMember]

    def get_queryset(self):
        """Возвращает этапы для проектов пользователя"""
        project_id = self.request.query_params.get('project')
        if project_id:
            return DevelopmentStage.objects.filter(project_id=project_id)
        # Возвращаем этапы всех проектов пользователя
        user_projects = Project.objects.filter(
            Q(owner=self.request.user) | Q(members=self.request.user)
        )
        return DevelopmentStage.objects.filter(project__in=user_projects)

    def perform_create(self, serializer):
        """При создании этапа проверяем права доступа"""
        project = serializer.validated_data['project']
        if project.owner != self.request.user and not project.members.filter(id=self.request.user.id).exists():
            raise PermissionError('Нет доступа к проекту')
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProjectOwnerOrMember])
    def toggle_complete(self, request, pk=None):
        """Переключить статус завершения этапа"""
        stage = self.get_object()
        stage.is_completed = not stage.is_completed
        stage.save()
        serializer = self.get_serializer(stage)
        return Response(serializer.data)


class StageCommentViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с комментариями к этапам"""
    serializer_class = StageCommentSerializer
    permission_classes = [IsAuthenticated, IsProjectOwnerOrMember]

    def get_queryset(self):
        """Возвращает комментарии для этапов проектов пользователя"""
        stage_id = self.request.query_params.get('stage')
        if stage_id:
            return StageComment.objects.filter(stage_id=stage_id)
        return StageComment.objects.filter(
            stage__project__in=Project.objects.filter(
                Q(owner=self.request.user) | Q(members=self.request.user)
            )
        )

    def perform_create(self, serializer):
        """При создании комментария устанавливаем автора"""
        serializer.save(author=self.request.user)


class StageHintViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для работы с подсказками (только чтение)"""
    serializer_class = StageHintSerializer
    permission_classes = [IsAuthenticated, IsProjectOwnerOrMember]

    def get_queryset(self):
        """Возвращает подсказки для этапов проектов пользователя"""
        stage_id = self.request.query_params.get('stage')
        if stage_id:
            return StageHint.objects.filter(stage_id=stage_id)
        user_projects = Project.objects.filter(
            Q(owner=self.request.user) | Q(members=self.request.user)
        )
        return StageHint.objects.filter(stage__project__in=user_projects)



