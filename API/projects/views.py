from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from .models import (
    Team, TeamMember, Project, ProjectComment, ProjectFile, ProjectCheck,
    Stage, StageComment, Task, KnowledgeBase,
    KanbanCard, KanbanCardFile, KanbanCardComment, KanbanCardCheck
)
from .serializers import (
    TeamSerializer, TeamMemberSerializer, ProjectSerializer, ProjectDetailSerializer,
    ProjectCommentSerializer, ProjectFileSerializer, ProjectCheckSerializer,
    StageSerializer, StageCommentSerializer, TaskSerializer, KnowledgeBaseSerializer,
    KanbanCardSerializer, KanbanCardFileSerializer, KanbanCardCommentSerializer, KanbanCardCheckSerializer
)
from .permissions import IsTeamMember, IsTeamLeader, IsProjectTeamMember, IsTeacher

User = get_user_model()


class TeamViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с командами"""
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает команды, где пользователь участник или создатель"""
        user = self.request.user
        return Team.objects.filter(
            Q(created_by=user) | Q(team_members__user=user)
        ).distinct()

    def perform_create(self, serializer):
        """При создании команды устанавливаем создателя и добавляем его как тимлида"""
        team = serializer.save(created_by=self.request.user)
        # Добавляем создателя как тимлида
        TeamMember.objects.create(
            team=team,
            user=self.request.user,
            role='team_leader',
            is_confirmed=True,
            invited_by=self.request.user,
            joined_at=timezone.now()
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def invite_member(self, request, pk=None):
        """Пригласить участника в команду по email"""
        team = self.get_object()
        
        # Проверяем, что пользователь - тимлид
        if not team.team_members.filter(user=request.user, role='team_leader', is_confirmed=True).exists():
            return Response(
                {'error': 'Только тимлид может приглашать участников'},
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
        if team.team_members.filter(user=user).exists():
            return Response(
                {'error': 'Пользователь уже является участником команды'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем приглашение
        member = TeamMember.objects.create(
            team=team,
            user=user,
            role='member',
            is_confirmed=False,
            invited_by=request.user
        )
        
        serializer = TeamMemberSerializer(member)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def confirm_participation(self, request, pk=None):
        """Подтвердить участие в команде"""
        team = self.get_object()
        
        try:
            member = team.team_members.get(user=request.user)
            if member.is_confirmed:
                return Response(
                    {'error': 'Участие уже подтверждено'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            member.is_confirmed = True
            member.joined_at = timezone.now()
            member.save()
            serializer = TeamMemberSerializer(member)
            return Response(serializer.data)
        except TeamMember.DoesNotExist:
            return Response(
                {'error': 'Вы не приглашены в эту команду'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTeamLeader])
    def assign_role(self, request, pk=None):
        """Назначить роль участнику (только тимлид)"""
        team = self.get_object()
        user_id = request.data.get('user_id')
        new_role = request.data.get('role')
        
        if not user_id or not new_role:
            return Response(
                {'error': 'user_id и role обязательны'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_role not in ['team_leader', 'member']:
            return Response(
                {'error': 'Неверная роль'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            member = team.team_members.get(user_id=user_id)
            member.role = new_role
            member.save()
            serializer = TeamMemberSerializer(member)
            return Response(serializer.data)
        except TeamMember.DoesNotExist:
            return Response(
                {'error': 'Участник не найден'},
                status=status.HTTP_404_NOT_FOUND
            )


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с проектами"""
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает проекты команд, где пользователь участник, или все проекты для преподавателей"""
        user = self.request.user
        # Преподаватели видят все проекты
        if user.is_staff or getattr(user, 'is_teacher', False):
            return Project.objects.all()
        # Обычные пользователи видят только проекты своих команд
        user_teams = Team.objects.filter(team_members__user=user, team_members__is_confirmed=True)
        return Project.objects.filter(team__in=user_teams)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        """При создании проекта устанавливаем создателя"""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProjectTeamMember])
    def submit(self, request, pk=None):
        """Отправить проект на проверку преподавателю"""
        project = self.get_object()
        
        if project.status not in ['draft', 'revision']:
            return Response(
                {'error': 'Проект уже отправлен на проверку или принят'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not project.passport and not project.passport_text:
            return Response(
                {'error': 'Загрузите паспорт проекта (файл) перед отправкой'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        project.status = 'submitted'
        project.submitted_at = timezone.now()
        project.save()
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTeacher])
    def approve(self, request, pk=None):
        """Принять проект (преподаватель)"""
        project = self.get_object()
        
        if project.status != 'submitted':
            return Response(
                {'error': 'Проект не находится на проверке'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        project.status = 'approved'
        project.reviewed_by = request.user
        project.reviewed_at = timezone.now()
        project.save()
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTeacher])
    def request_revision(self, request, pk=None):
        """Вернуть проект на доработку (преподаватель)"""
        project = self.get_object()
        
        if project.status != 'submitted':
            return Response(
                {'error': 'Проект не находится на проверке'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comment_text = request.data.get('comment', '')
        if comment_text:
            ProjectComment.objects.create(
                project=project,
                author=request.user,
                text=comment_text
            )
        
        project.status = 'revision'
        project.reviewed_by = request.user
        project.reviewed_at = timezone.now()
        project.save()
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTeacher])
    def reject(self, request, pk=None):
        """Отклонить проект (преподаватель)"""
        project = self.get_object()
        
        if project.status != 'submitted':
            return Response(
                {'error': 'Проект не находится на проверке'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comment_text = request.data.get('comment', '')
        if comment_text:
            ProjectComment.objects.create(
                project=project,
                author=request.user,
                text=comment_text
            )
        
        project.status = 'rejected'
        project.reviewed_by = request.user
        project.reviewed_at = timezone.now()
        project.save()
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def move_card(self, request, pk=None):
        """Переместить карточку проекта между колонками канбан-доски"""
        project = self.get_object()
        
        # Проверяем права доступа
        user = request.user
        if not user.is_staff and not project.team.team_members.filter(user=user, is_confirmed=True).exists():
            return Response(
                {'error': 'Нет доступа к этому проекту'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_column = request.data.get('kanban_column')
        new_order = request.data.get('order', 0)
        
        if new_column not in ['column1', 'column2', 'column3']:
            return Response(
                {'error': 'Неверная колонка. Используйте column1, column2 или column3'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        project.kanban_column = new_column
        project.order = new_order
        project.save()
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)


class ProjectCommentViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с комментариями к проекту"""
    serializer_class = ProjectCommentSerializer
    permission_classes = [IsAuthenticated, IsProjectTeamMember]

    def get_queryset(self):
        """Возвращает комментарии для проектов команд пользователя, или все комментарии для преподавателей"""
        user = self.request.user
        project_id = self.request.query_params.get('project')
        if project_id:
            return ProjectComment.objects.filter(project_id=project_id)
        # Преподаватели видят все комментарии
        if user.is_staff or getattr(user, 'is_teacher', False):
            return ProjectComment.objects.all()
        # Обычные пользователи видят только комментарии проектов своих команд
        user_teams = Team.objects.filter(team_members__user=user, team_members__is_confirmed=True)
        return ProjectComment.objects.filter(project__team__in=user_teams)

    def perform_create(self, serializer):
        """При создании комментария устанавливаем автора"""
        serializer.save(author=self.request.user)


class StageViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с этапами"""
    serializer_class = StageSerializer
    permission_classes = [IsAuthenticated, IsProjectTeamMember]

    def get_queryset(self):
        """Возвращает этапы для проектов команд пользователя, или все этапы для преподавателей"""
        user = self.request.user
        project_id = self.request.query_params.get('project')
        if project_id:
            return Stage.objects.filter(project_id=project_id)
        # Преподаватели видят все этапы
        if user.is_staff or getattr(user, 'is_teacher', False):
            return Stage.objects.all()
        # Обычные пользователи видят только этапы проектов своих команд
        user_teams = Team.objects.filter(team_members__user=user, team_members__is_confirmed=True)
        return Stage.objects.filter(project__team__in=user_teams)

    def perform_create(self, serializer):
        """При создании этапа проверяем права доступа"""
        project = serializer.validated_data['project']
        if not project.team.team_members.filter(user=self.request.user, is_confirmed=True).exists():
            raise PermissionError('Нет доступа к проекту')
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProjectTeamMember])
    def submit(self, request, pk=None):
        """Отправить этап на проверку"""
        stage = self.get_object()
        
        if stage.status != 'in_progress':
            return Response(
                {'error': 'Этап уже отправлен на проверку или принят'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not stage.artifact:
            return Response(
                {'error': 'Загрузите артефакт этапа перед отправкой'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stage.status = 'submitted'
        stage.submitted_at = timezone.now()
        stage.save()
        
        serializer = self.get_serializer(stage)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTeacher])
    def approve(self, request, pk=None):
        """Принять этап (преподаватель)"""
        stage = self.get_object()
        
        if stage.status != 'submitted':
            return Response(
                {'error': 'Этап не находится на проверке'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stage.status = 'approved'
        stage.reviewed_by = request.user
        stage.reviewed_at = timezone.now()
        stage.save()
        
        serializer = self.get_serializer(stage)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTeacher])
    def request_revision(self, request, pk=None):
        """Вернуть этап на доработку (преподаватель)"""
        stage = self.get_object()
        
        if stage.status != 'submitted':
            return Response(
                {'error': 'Этап не находится на проверке'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comment_text = request.data.get('comment', '')
        if comment_text:
            StageComment.objects.create(
                stage=stage,
                author=request.user,
                text=comment_text
            )
        
        stage.status = 'revision'
        stage.reviewed_by = request.user
        stage.reviewed_at = timezone.now()
        stage.save()
        
        serializer = self.get_serializer(stage)
        return Response(serializer.data)


class StageCommentViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с комментариями к этапам"""
    serializer_class = StageCommentSerializer
    permission_classes = [IsAuthenticated, IsProjectTeamMember]

    def get_queryset(self):
        """Возвращает комментарии для этапов проектов команд пользователя, или все комментарии для преподавателей"""
        user = self.request.user
        stage_id = self.request.query_params.get('stage')
        if stage_id:
            return StageComment.objects.filter(stage_id=stage_id)
        # Преподаватели видят все комментарии
        if user.is_staff or getattr(user, 'is_teacher', False):
            return StageComment.objects.all()
        # Обычные пользователи видят только комментарии этапов проектов своих команд
        user_teams = Team.objects.filter(team_members__user=user, team_members__is_confirmed=True)
        return StageComment.objects.filter(stage__project__team__in=user_teams)

    def perform_create(self, serializer):
        """При создании комментария устанавливаем автора"""
        serializer.save(author=self.request.user)


class TaskViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с задачами"""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsProjectTeamMember]

    def get_queryset(self):
        """Возвращает задачи для этапов проектов команд пользователя, или все задачи для преподавателей"""
        user = self.request.user
        stage_id = self.request.query_params.get('stage')
        if stage_id:
            return Task.objects.filter(stage_id=stage_id)
        # Преподаватели видят все задачи
        if user.is_staff or getattr(user, 'is_teacher', False):
            return Task.objects.all()
        # Обычные пользователи видят только задачи этапов проектов своих команд
        user_teams = Team.objects.filter(team_members__user=user, team_members__is_confirmed=True)
        return Task.objects.filter(stage__project__team__in=user_teams)

    def perform_create(self, serializer):
        """При создании задачи устанавливаем назначившего"""
        serializer.save(assigned_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProjectTeamMember])
    def assign(self, request, pk=None):
        """Назначить задачу участнику (тимлид)"""
        task = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что пользователь - тимлид команды проекта
        project = task.stage.project
        if not project.team.team_members.filter(user=request.user, role='team_leader', is_confirmed=True).exists():
            return Response(
                {'error': 'Только тимлид может назначать задачи'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = User.objects.get(id=user_id)
            # Проверяем, что пользователь - участник команды
            if not project.team.team_members.filter(user=user, is_confirmed=True).exists():
                return Response(
                    {'error': 'Пользователь не является участником команды'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            task.assigned_to = user
            task.assigned_by = request.user
            task.save()
            serializer = self.get_serializer(task)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProjectTeamMember])
    def complete(self, request, pk=None):
        """Завершить задачу"""
        task = self.get_object()
        
        # Проверяем, что задача назначена на текущего пользователя
        if task.assigned_to != request.user:
            return Response(
                {'error': 'Вы не можете завершить эту задачу'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task.status = 'completed'
        task.completed_at = timezone.now()
        task.save()
        
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProjectTeamMember])
    def return_task(self, request, pk=None):
        """Вернуть задачу тимлиду"""
        task = self.get_object()
        
        # Проверяем, что задача назначена на текущего пользователя
        if task.assigned_to != request.user:
            return Response(
                {'error': 'Вы не можете вернуть эту задачу'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        blocker = request.data.get('blocker', '')
        task.status = 'returned'
        task.blocker = blocker
        task.save()
        
        serializer = self.get_serializer(task)
        return Response(serializer.data)


class ProjectFileViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с файлами проектов"""
    serializer_class = ProjectFileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает файлы для проектов команд пользователя, или все файлы для преподавателей"""
        user = self.request.user
        project_id = self.request.query_params.get('project')
        if project_id:
            return ProjectFile.objects.filter(project_id=project_id)
        # Преподаватели видят все файлы
        if user.is_staff or getattr(user, 'is_teacher', False):
            return ProjectFile.objects.all()
        # Обычные пользователи видят только файлы проектов своих команд
        user_teams = Team.objects.filter(team_members__user=user, team_members__is_confirmed=True)
        return ProjectFile.objects.filter(project__team__in=user_teams)

    def perform_create(self, serializer):
        """При создании файла устанавливаем загрузившего"""
        serializer.save(uploaded_by=self.request.user)


class ProjectCheckViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с галочками преподавателя"""
    serializer_class = ProjectCheckSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        """Возвращает галочки для проектов"""
        project_id = self.request.query_params.get('project')
        if project_id:
            return ProjectCheck.objects.filter(project_id=project_id)
        return ProjectCheck.objects.all()

    def perform_create(self, serializer):
        """При создании галочки устанавливаем преподавателя"""
        serializer.save(teacher=self.request.user)

    @action(detail=False, methods=['post'])
    def get_or_create(self, request):
        """Получить или создать галочку для проекта и преподавателя"""
        project_id = request.data.get('project')
        if not project_id:
            return Response(
                {'error': 'project обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Проект не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        check, created = ProjectCheck.objects.get_or_create(
            project=project,
            teacher=request.user,
            defaults={'is_checked': False}
        )
        
        serializer = self.get_serializer(check)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class KanbanCardViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с карточками канбан-доски"""
    serializer_class = KanbanCardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает карточки для проектов команд пользователя, или все карточки для преподавателей"""
        user = self.request.user
        project_id = self.request.query_params.get('project')
        if project_id:
            return KanbanCard.objects.filter(project_id=project_id)
        # Преподаватели видят все карточки
        if user.is_staff or getattr(user, 'is_teacher', False):
            return KanbanCard.objects.all()
        # Обычные пользователи видят только карточки проектов своих команд
        user_teams = Team.objects.filter(team_members__user=user, team_members__is_confirmed=True)
        return KanbanCard.objects.filter(project__team__in=user_teams)

    def perform_create(self, serializer):
        """При создании карточки проверяем права - все участники команды могут создавать"""
        project = serializer.validated_data['project']
        user = self.request.user
        
        # Участник команды может создавать
        is_team_member = project.team.team_members.filter(
            user=user, is_confirmed=True
        ).exists()
        
        # Преподаватель может создавать
        is_teacher = user.is_staff or getattr(user, 'is_teacher', False)
        
        if not (is_team_member or is_teacher):
            raise PermissionError('Только участники команды или преподаватель могут создавать карточки')
        
        serializer.save(created_by=user)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def move(self, request, pk=None):
        """Переместить карточку между колонками"""
        card = self.get_object()
        
        # Проверяем права доступа - участники команды и преподаватели могут перемещать
        user = request.user
        can_move = False
        if user.is_staff or getattr(user, 'is_teacher', False):
            can_move = True
        elif card.project.team.team_members.filter(user=user, is_confirmed=True).exists():
            can_move = True
        
        if not can_move:
            return Response(
                {'error': 'Нет прав для перемещения карточки'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_column = request.data.get('column')
        new_order = request.data.get('order', 0)
        
        if new_column not in ['column1', 'column2', 'column3']:
            return Response(
                {'error': 'Неверная колонка. Используйте column1, column2 или column3'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        card.column = new_column
        card.order = new_order
        card.save()
        
        serializer = self.get_serializer(card)
        return Response(serializer.data)


class KanbanCardFileViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с файлами карточек"""
    serializer_class = KanbanCardFileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает файлы для карточек проектов команд пользователя"""
        user = self.request.user
        card_id = self.request.query_params.get('card')
        if card_id:
            return KanbanCardFile.objects.filter(card_id=card_id)
        # Преподаватели видят все файлы
        if user.is_staff or getattr(user, 'is_teacher', False):
            return KanbanCardFile.objects.all()
        # Обычные пользователи видят только файлы карточек проектов своих команд
        user_teams = Team.objects.filter(team_members__user=user, team_members__is_confirmed=True)
        return KanbanCardFile.objects.filter(card__project__team__in=user_teams)

    def perform_create(self, serializer):
        """При создании файла устанавливаем загрузившего"""
        serializer.save(uploaded_by=self.request.user)


class KanbanCardCommentViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с комментариями к карточкам"""
    serializer_class = KanbanCardCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает комментарии для карточек проектов команд пользователя"""
        user = self.request.user
        card_id = self.request.query_params.get('card')
        if card_id:
            return KanbanCardComment.objects.filter(card_id=card_id)
        # Преподаватели видят все комментарии
        if user.is_staff or getattr(user, 'is_teacher', False):
            return KanbanCardComment.objects.all()
        # Обычные пользователи видят только комментарии карточек проектов своих команд
        user_teams = Team.objects.filter(team_members__user=user, team_members__is_confirmed=True)
        return KanbanCardComment.objects.filter(card__project__team__in=user_teams)

    def perform_create(self, serializer):
        """При создании комментария устанавливаем автора"""
        serializer.save(author=self.request.user)


class KanbanCardCheckViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с галочками преподавателя на карточках"""
    serializer_class = KanbanCardCheckSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        """Возвращает галочки для карточек"""
        card_id = self.request.query_params.get('card')
        if card_id:
            return KanbanCardCheck.objects.filter(card_id=card_id)
        return KanbanCardCheck.objects.all()

    def perform_create(self, serializer):
        """При создании галочки устанавливаем преподавателя"""
        serializer.save(teacher=self.request.user)

    @action(detail=False, methods=['post'])
    def get_or_create(self, request):
        """Получить или создать галочку для карточки и преподавателя"""
        card_id = request.data.get('card')
        if not card_id:
            return Response(
                {'error': 'card обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            card = KanbanCard.objects.get(pk=card_id)
        except KanbanCard.DoesNotExist:
            return Response(
                {'error': 'Карточка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        check, created = KanbanCardCheck.objects.get_or_create(
            card=card,
            teacher=request.user,
            defaults={'is_checked': False}
        )
        
        serializer = self.get_serializer(check)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class KnowledgeBaseViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для работы с базой знаний (только чтение)"""
    serializer_class = KnowledgeBaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает материалы базы знаний"""
        section = self.request.query_params.get('section')
        if section:
            return KnowledgeBase.objects.filter(section=section)
        return KnowledgeBase.objects.all()


class TeacherDashboardViewSet(viewsets.ViewSet):
    """ViewSet для панели преподавателя"""
    permission_classes = [IsAuthenticated, IsTeacher]

    @action(detail=False, methods=['get'])
    def pending_projects(self, request):
        """Получить список проектов на проверке"""
        projects = Project.objects.filter(status='submitted').order_by('-submitted_at')
        serializer = ProjectSerializer(projects, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending_stages(self, request):
        """Получить список этапов на проверке"""
        stages = Stage.objects.filter(status='submitted').order_by('-submitted_at')
        serializer = StageSerializer(stages, many=True, context={'request': request})
        return Response(serializer.data)
