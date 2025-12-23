from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project, ProjectMember, DevelopmentStage, StageComment, ProjectChatMessage, StageHint

User = get_user_model()


class UserShortSerializer(serializers.ModelSerializer):
    """Краткий сериализатор пользователя"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'avatar']


class ProjectMemberSerializer(serializers.ModelSerializer):
    """Сериализатор участника проекта"""
    user = UserShortSerializer(read_only=True)
    
    class Meta:
        model = ProjectMember
        fields = ['id', 'user', 'role', 'joined_at']


class ProjectSerializer(serializers.ModelSerializer):
    """Сериализатор проекта"""
    owner = UserShortSerializer(read_only=True)
    members_count = serializers.IntegerField(source='members.count', read_only=True)
    is_owner = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'owner', 'members_count', 
                  'is_owner', 'is_member', 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
    
    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.owner == request.user
        return False
    
    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.members.filter(id=request.user.id).exists()
        return False


class StageHintSerializer(serializers.ModelSerializer):
    """Сериализатор подсказки"""
    class Meta:
        model = StageHint
        fields = ['id', 'title', 'content', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class DevelopmentStageSerializer(serializers.ModelSerializer):
    """Сериализатор этапа разработки"""
    hints = StageHintSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    
    class Meta:
        model = DevelopmentStage
        fields = ['id', 'project', 'name', 'stage_type', 'description', 'order', 
                  'is_completed', 'hints', 'comments_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectDetailSerializer(ProjectSerializer):
    """Детальный сериализатор проекта"""
    members = ProjectMemberSerializer(source='project_members', many=True, read_only=True)
    stages = DevelopmentStageSerializer(many=True, read_only=True)
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['members', 'stages']


class StageCommentSerializer(serializers.ModelSerializer):
    """Сериализатор комментария к этапу"""
    author = UserShortSerializer(read_only=True)
    
    class Meta:
        model = StageComment
        fields = ['id', 'stage', 'author', 'text', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class ProjectChatMessageSerializer(serializers.ModelSerializer):
    """Сериализатор сообщения в чате проекта"""
    author = UserShortSerializer(read_only=True)
    
    class Meta:
        model = ProjectChatMessage
        fields = ['id', 'project', 'author', 'text', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Изменяем порядок сортировки для отображения"""
        data = super().to_representation(instance)
        return data



