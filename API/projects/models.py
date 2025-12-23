from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator

User = get_user_model()


class Project(models.Model):
    """Модель проекта"""
    name = models.CharField(max_length=200, validators=[MinLengthValidator(3)], verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_projects', verbose_name='Владелец')
    members = models.ManyToManyField(User, through='ProjectMember', related_name='projects', verbose_name='Участники')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    is_active = models.BooleanField(default=True, verbose_name='Активен')

    class Meta:
        verbose_name = 'Проект'
        verbose_name_plural = 'Проекты'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ProjectMember(models.Model):
    """Модель участника проекта"""
    ROLE_CHOICES = [
        ('owner', 'Владелец'),
        ('member', 'Участник'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='project_members', verbose_name='Проект')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_memberships', verbose_name='Пользователь')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member', verbose_name='Роль')
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата присоединения')

    class Meta:
        verbose_name = 'Участник проекта'
        verbose_name_plural = 'Участники проектов'
        unique_together = ['project', 'user']
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.email} - {self.project.name}"


class DevelopmentStage(models.Model):
    """Модель этапа разработки проекта"""
    STAGE_TYPES = [
        ('planning', 'Планирование'),
        ('analysis', 'Анализ'),
        ('design', 'Проектирование'),
        ('development', 'Разработка'),
        ('testing', 'Тестирование'),
        ('deployment', 'Внедрение'),
        ('maintenance', 'Поддержка'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='stages', verbose_name='Проект')
    name = models.CharField(max_length=200, verbose_name='Название этапа')
    stage_type = models.CharField(max_length=20, choices=STAGE_TYPES, verbose_name='Тип этапа')
    description = models.TextField(blank=True, verbose_name='Описание')
    order = models.IntegerField(default=0, verbose_name='Порядок')
    is_completed = models.BooleanField(default=False, verbose_name='Завершен')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Этап разработки'
        verbose_name_plural = 'Этапы разработки'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.project.name} - {self.name}"


class StageComment(models.Model):
    """Модель комментария к этапу"""
    stage = models.ForeignKey(DevelopmentStage, on_delete=models.CASCADE, related_name='comments', verbose_name='Этап')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stage_comments', verbose_name='Автор')
    text = models.TextField(verbose_name='Текст комментария')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Комментарий к этапу'
        verbose_name_plural = 'Комментарии к этапам'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.author.email} - {self.stage.name}"


class ProjectChatMessage(models.Model):
    """Модель сообщения в общем чате проекта"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='chat_messages', verbose_name='Проект')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages', verbose_name='Автор')
    text = models.TextField(verbose_name='Текст сообщения')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Сообщение в чате'
        verbose_name_plural = 'Сообщения в чате'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.author.email} - {self.project.name}"


class StageHint(models.Model):
    """Модель подсказки для этапа"""
    stage = models.ForeignKey(DevelopmentStage, on_delete=models.CASCADE, related_name='hints', verbose_name='Этап')
    title = models.CharField(max_length=200, verbose_name='Заголовок')
    content = models.TextField(verbose_name='Содержание подсказки')
    order = models.IntegerField(default=0, verbose_name='Порядок')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        verbose_name = 'Подсказка'
        verbose_name_plural = 'Подсказки'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.stage.name} - {self.title}"



