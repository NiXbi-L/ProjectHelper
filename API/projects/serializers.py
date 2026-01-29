from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Team, TeamMember, Project, ProjectComment, ProjectFile, ProjectCheck,
    Stage, StageComment, Task, KnowledgeBase,
    KanbanCard, KanbanCardFile, KanbanCardComment, KanbanCardCheck
)

User = get_user_model()


class UserShortSerializer(serializers.ModelSerializer):
    """Краткий сериализатор пользователя"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'avatar']


class TeamMemberSerializer(serializers.ModelSerializer):
    """Сериализатор участника команды"""
    user = UserShortSerializer(read_only=True)
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)
    
    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'role', 'is_confirmed', 'invited_by_email', 
                  'joined_at', 'created_at']
        read_only_fields = ['id', 'user', 'invited_by_email', 'joined_at', 'created_at']


class TeamSerializer(serializers.ModelSerializer):
    """Сериализатор команды"""
    created_by = UserShortSerializer(read_only=True)
    team_members = TeamMemberSerializer(many=True, read_only=True)
    members_count = serializers.IntegerField(source='team_members.count', read_only=True)
    is_team_leader = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = ['id', 'name', 'created_by', 'team_members', 'members_count',
                  'is_team_leader', 'is_member', 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_is_team_leader(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            member = obj.team_members.filter(user=request.user, role='team_leader').first()
            return member is not None
        return False
    
    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.team_members.filter(user=request.user).exists()
        return False


class ProjectCommentSerializer(serializers.ModelSerializer):
    """Сериализатор комментария к проекту"""
    author = UserShortSerializer(read_only=True)
    
    class Meta:
        model = ProjectComment
        fields = ['id', 'author', 'text', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class ProjectFileSerializer(serializers.ModelSerializer):
    """Сериализатор файла проекта"""
    uploaded_by = UserShortSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectFile
        fields = ['id', 'project', 'file', 'file_url', 'name', 'uploaded_by', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class ProjectCheckSerializer(serializers.ModelSerializer):
    """Сериализатор галочки преподавателя"""
    teacher = UserShortSerializer(read_only=True)
    
    class Meta:
        model = ProjectCheck
        fields = ['id', 'project', 'teacher', 'is_checked', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'teacher', 'created_at', 'updated_at']


class ProjectSerializer(serializers.ModelSerializer):
    """Сериализатор проекта"""
    team = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all())
    team_name = serializers.CharField(source='team.name', read_only=True)
    created_by = UserShortSerializer(read_only=True)
    reviewed_by = UserShortSerializer(read_only=True)
    comments = ProjectCommentSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    files = ProjectFileSerializer(many=True, read_only=True)
    files_count = serializers.IntegerField(source='files.count', read_only=True)
    teacher_checks = ProjectCheckSerializer(many=True, read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_submit = serializers.SerializerMethodField()
    
    passport_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'team', 'team_name', 'passport', 'passport_url', 'passport_text', 'description', 'status',
                  'kanban_column', 'order', 'created_by', 'created_at', 'updated_at', 
                  'submitted_at', 'reviewed_by', 'reviewed_at', 'comments', 'comments_count',
                  'files', 'files_count', 'teacher_checks', 'can_edit', 'can_submit']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at',
                           'submitted_at', 'reviewed_by', 'reviewed_at']
    
    def get_passport_url(self, obj):
        if obj.passport:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.passport.url)
        return None
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Могут редактировать участники команды, если проект в черновике или на доработке
            if obj.status in ['draft', 'revision']:
                return obj.team.team_members.filter(user=request.user).exists()
        return False
    
    def get_can_submit(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Могут отправлять участники команды, если проект в черновике или на доработке
            if obj.status in ['draft', 'revision']:
                return obj.team.team_members.filter(user=request.user).exists()
        return False


class StageCommentSerializer(serializers.ModelSerializer):
    """Сериализатор комментария к этапу"""
    author = UserShortSerializer(read_only=True)
    
    class Meta:
        model = StageComment
        fields = ['id', 'author', 'text', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class TaskSerializer(serializers.ModelSerializer):
    """Сериализатор задачи"""
    assigned_to = UserShortSerializer(read_only=True)
    assigned_by = UserShortSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='assigned_to', write_only=True, required=False, allow_null=True
    )
    
    class Meta:
        model = Task
        fields = ['id', 'stage', 'name', 'description', 'assigned_to', 'assigned_to_id',
                  'assigned_by', 'deadline', 'status', 'blocker', 'created_at',
                  'updated_at', 'completed_at']
        read_only_fields = ['id', 'assigned_by', 'created_at', 'updated_at', 'completed_at']


class StageSerializer(serializers.ModelSerializer):
    """Сериализатор этапа"""
    tasks = TaskSerializer(many=True, read_only=True)
    comments = StageCommentSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    reviewed_by = UserShortSerializer(read_only=True)
    can_submit = serializers.SerializerMethodField()
    artifact_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Stage
        fields = ['id', 'project', 'name', 'description', 'criteria', 'artifact',
                  'artifact_url', 'artifact_description', 'deadline', 'status',
                  'order', 'created_at', 'updated_at', 'submitted_at',
                  'reviewed_by', 'reviewed_at', 'tasks', 'comments', 'comments_count',
                  'can_submit']
        read_only_fields = ['id', 'created_at', 'updated_at', 'submitted_at',
                           'reviewed_by', 'reviewed_at']
    
    def get_artifact_url(self, obj):
        if obj.artifact:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.artifact.url)
        return None
    
    def get_can_submit(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Могут отправлять участники команды, если этап в работе
            if obj.status == 'in_progress':
                return obj.project.team.team_members.filter(user=request.user).exists()
        return False


class KanbanCardFileSerializer(serializers.ModelSerializer):
    """Сериализатор файла карточки"""
    uploaded_by = UserShortSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = KanbanCardFile
        fields = ['id', 'card', 'file', 'file_url', 'name', 'uploaded_by', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class KanbanCardCommentSerializer(serializers.ModelSerializer):
    """Сериализатор комментария к карточке"""
    author = UserShortSerializer(read_only=True)
    
    class Meta:
        model = KanbanCardComment
        fields = ['id', 'author', 'text', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class KanbanCardCheckSerializer(serializers.ModelSerializer):
    """Сериализатор галочки преподавателя для карточки"""
    teacher = UserShortSerializer(read_only=True)
    
    class Meta:
        model = KanbanCardCheck
        fields = ['id', 'card', 'teacher', 'is_checked', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'teacher', 'created_at', 'updated_at']


class KanbanCardSerializer(serializers.ModelSerializer):
    """Сериализатор карточки канбан-доски"""
    created_by = UserShortSerializer(read_only=True)
    files = KanbanCardFileSerializer(many=True, read_only=True)
    files_count = serializers.IntegerField(source='files.count', read_only=True)
    comments = KanbanCardCommentSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    teacher_checks = KanbanCardCheckSerializer(many=True, read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_move = serializers.SerializerMethodField()
    
    class Meta:
        model = KanbanCard
        fields = ['id', 'project', 'title', 'description', 'column', 'order',
                  'created_by', 'created_at', 'updated_at', 'files', 'files_count',
                  'comments', 'comments_count', 'teacher_checks', 'can_edit', 'can_move']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Тимлид может редактировать
            if obj.project.team.team_members.filter(user=request.user, role='team_leader', is_confirmed=True).exists():
                return True
            # Преподаватель может редактировать
            if request.user.is_staff or getattr(request.user, 'is_teacher', False):
                return True
        return False
    
    def get_can_move(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Участники команды могут перемещать
            if obj.project.team.team_members.filter(user=request.user, is_confirmed=True).exists():
                return True
            # Преподаватель может перемещать
            if request.user.is_staff or getattr(request.user, 'is_teacher', False):
                return True
        return False


class ProjectDetailSerializer(ProjectSerializer):
    """Детальный сериализатор проекта"""
    stages = StageSerializer(many=True, read_only=True)
    kanban_cards = KanbanCardSerializer(many=True, read_only=True)
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['stages', 'kanban_cards']


class KnowledgeBaseSerializer(serializers.ModelSerializer):
    """Сериализатор базы знаний"""
    class Meta:
        model = KnowledgeBase
        fields = ['id', 'section', 'title', 'content', 'order', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
