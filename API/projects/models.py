from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator

User = get_user_model()


class Team(models.Model):
    """Модель команды"""
    name = models.CharField(max_length=200, validators=[MinLengthValidator(3)], verbose_name='Название команды')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_teams', verbose_name='Создатель')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    is_active = models.BooleanField(default=True, verbose_name='Активна')

    class Meta:
        verbose_name = 'Команда'
        verbose_name_plural = 'Команды'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def team_leader(self):
        """Возвращает тимлида команды"""
        return self.team_members.filter(role='team_leader').first()


class TeamMember(models.Model):
    """Модель участника команды"""
    ROLE_CHOICES = [
        ('team_leader', 'Тимлид'),
        ('member', 'Участник'),
    ]
    
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='team_members', verbose_name='Команда')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='team_memberships', verbose_name='Пользователь')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member', verbose_name='Роль')
    is_confirmed = models.BooleanField(default=False, verbose_name='Подтверждено участие')
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='invited_members', verbose_name='Приглашен')
    joined_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата присоединения')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        verbose_name = 'Участник команды'
        verbose_name_plural = 'Участники команд'
        unique_together = ['team', 'user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.team.name}"


class Project(models.Model):
    """Модель проекта (паспорт/инициатива)"""
    PROJECT_STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('submitted', 'Отправлен на проверку'),
        ('approved', 'Принято'),
        ('revision', 'На доработке'),
        ('rejected', 'Отклонено'),
    ]
    
    KANBAN_COLUMN_CHOICES = [
        ('column1', 'Колонка 1'),
        ('column2', 'Колонка 2'),
        ('column3', 'Колонка 3'),
    ]
    
    name = models.CharField(max_length=200, validators=[MinLengthValidator(3)], verbose_name='Название проекта')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='projects', verbose_name='Команда')
    passport = models.FileField(upload_to='project_passports/', blank=True, null=True, verbose_name='Паспорт проекта (файл)')
    passport_text = models.TextField(blank=True, verbose_name='Текст паспорта проекта (опционально)')
    description = models.TextField(blank=True, verbose_name='Описание проекта')
    status = models.CharField(max_length=20, choices=PROJECT_STATUS_CHOICES, default='draft', verbose_name='Статус')
    kanban_column = models.CharField(max_length=20, choices=KANBAN_COLUMN_CHOICES, default='column1', verbose_name='Колонка канбан-доски')
    order = models.IntegerField(default=0, verbose_name='Порядок в колонке')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_projects', verbose_name='Создатель')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата отправки на проверку')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_projects', verbose_name='Проверил')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата проверки')

    class Meta:
        verbose_name = 'Проект'
        verbose_name_plural = 'Проекты'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ProjectComment(models.Model):
    """Модель комментария к проекту (для обратной связи преподавателя)"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='comments', verbose_name='Проект')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_comments', verbose_name='Автор')
    text = models.TextField(verbose_name='Текст комментария')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Комментарий к проекту'
        verbose_name_plural = 'Комментарии к проектам'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.author.email} - {self.project.name}"


class Stage(models.Model):
    """Модель этапа проекта"""
    STAGE_STATUS_CHOICES = [
        ('in_progress', 'В работе'),
        ('submitted', 'На проверке'),
        ('approved', 'Принято'),
        ('revision', 'На доработке'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='stages', verbose_name='Проект')
    name = models.CharField(max_length=200, verbose_name='Название этапа')
    description = models.TextField(blank=True, verbose_name='Описание')
    criteria = models.TextField(blank=True, verbose_name='Критерии приемки')
    artifact = models.FileField(upload_to='artifacts/', null=True, blank=True, verbose_name='Артефакт')
    artifact_description = models.TextField(blank=True, verbose_name='Описание артефакта')
    deadline = models.DateTimeField(null=True, blank=True, verbose_name='Дедлайн')
    status = models.CharField(max_length=20, choices=STAGE_STATUS_CHOICES, default='in_progress', verbose_name='Статус')
    order = models.IntegerField(default=0, verbose_name='Порядок')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата отправки на проверку')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_stages', verbose_name='Проверил')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата проверки')

    class Meta:
        verbose_name = 'Этап'
        verbose_name_plural = 'Этапы'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.project.name} - {self.name}"


class StageComment(models.Model):
    """Модель комментария к этапу"""
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='comments', verbose_name='Этап')
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


class Task(models.Model):
    """Модель задачи внутри этапа"""
    TASK_STATUS_CHOICES = [
        ('new', 'Новая'),
        ('in_progress', 'В работе'),
        ('completed', 'Выполнена'),
        ('returned', 'Возвращена'),
    ]
    
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='tasks', verbose_name='Этап')
    name = models.CharField(max_length=200, verbose_name='Название задачи')
    description = models.TextField(blank=True, verbose_name='Описание')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks', verbose_name='Назначена')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tasks', verbose_name='Назначил')
    deadline = models.DateTimeField(null=True, blank=True, verbose_name='Дедлайн')
    status = models.CharField(max_length=20, choices=TASK_STATUS_CHOICES, default='new', verbose_name='Статус')
    blocker = models.TextField(blank=True, verbose_name='Блокер')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата выполнения')

    class Meta:
        verbose_name = 'Задача'
        verbose_name_plural = 'Задачи'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.stage.name} - {self.name}"


class KnowledgeBase(models.Model):
    """Модель базы знаний (материалы для студентов)"""
    SECTION_CHOICES = [
        ('team', 'Команда'),
        ('project_passport', 'Паспорт проекта'),
        ('stage', 'Этап'),
        ('task', 'Задача'),
    ]
    
    section = models.CharField(max_length=50, choices=SECTION_CHOICES, verbose_name='Раздел')
    title = models.CharField(max_length=200, verbose_name='Заголовок')
    content = models.TextField(verbose_name='Содержание')
    order = models.IntegerField(default=0, verbose_name='Порядок')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'База знаний'
        verbose_name_plural = 'База знаний'
        ordering = ['section', 'order', 'created_at']

    def __str__(self):
        return f"{self.get_section_display()} - {self.title}"


class ProjectFile(models.Model):
    """Модель файла, прикрепленного к проекту"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files', verbose_name='Проект')
    file = models.FileField(upload_to='project_files/', verbose_name='Файл')
    name = models.CharField(max_length=200, blank=True, verbose_name='Название файла')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_project_files', verbose_name='Загрузил')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата загрузки')

    class Meta:
        verbose_name = 'Файл проекта'
        verbose_name_plural = 'Файлы проектов'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.name} - {self.name or self.file.name}"


class ProjectCheck(models.Model):
    """Модель галочки преподавателя для проекта"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='teacher_checks', verbose_name='Проект')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_checks', verbose_name='Преподаватель')
    is_checked = models.BooleanField(default=False, verbose_name='Отмечено')
    comment = models.TextField(blank=True, verbose_name='Комментарий преподавателя')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Отметка преподавателя'
        verbose_name_plural = 'Отметки преподавателей'
        unique_together = ['project', 'teacher']
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.teacher.email} - {self.project.name}"


class KanbanCard(models.Model):
    """Модель карточки канбан-доски проекта"""
    COLUMN_CHOICES = [
        ('column1', 'Колонка 1'),
        ('column2', 'Колонка 2'),
        ('column3', 'Колонка 3'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='kanban_cards', verbose_name='Проект')
    title = models.CharField(max_length=200, verbose_name='Название карточки')
    description = models.TextField(blank=True, verbose_name='Описание')
    column = models.CharField(max_length=20, choices=COLUMN_CHOICES, default='column1', verbose_name='Колонка')
    order = models.IntegerField(default=0, verbose_name='Порядок в колонке')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_kanban_cards', verbose_name='Создатель')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Карточка канбан-доски'
        verbose_name_plural = 'Карточки канбан-доски'
        ordering = ['column', 'order', 'created_at']

    def __str__(self):
        return f"{self.project.name} - {self.title}"


class KanbanCardFile(models.Model):
    """Модель файла, прикрепленного к карточке канбан-доски"""
    card = models.ForeignKey(KanbanCard, on_delete=models.CASCADE, related_name='files', verbose_name='Карточка')
    file = models.FileField(upload_to='kanban_files/', verbose_name='Файл')
    name = models.CharField(max_length=200, blank=True, verbose_name='Название файла')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_kanban_files', verbose_name='Загрузил')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата загрузки')

    class Meta:
        verbose_name = 'Файл карточки'
        verbose_name_plural = 'Файлы карточек'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.card.title} - {self.name or self.file.name}"


class KanbanCardComment(models.Model):
    """Модель комментария к карточке канбан-доски"""
    card = models.ForeignKey(KanbanCard, on_delete=models.CASCADE, related_name='comments', verbose_name='Карточка')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kanban_card_comments', verbose_name='Автор')
    text = models.TextField(verbose_name='Текст комментария')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Комментарий к карточке'
        verbose_name_plural = 'Комментарии к карточкам'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.author.email} - {self.card.title}"


class KanbanCardCheck(models.Model):
    """Модель галочки преподавателя для карточки канбан-доски"""
    card = models.ForeignKey(KanbanCard, on_delete=models.CASCADE, related_name='teacher_checks', verbose_name='Карточка')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kanban_card_checks', verbose_name='Преподаватель')
    is_checked = models.BooleanField(default=False, verbose_name='Отмечено')
    comment = models.TextField(blank=True, verbose_name='Комментарий преподавателя')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Отметка преподавателя на карточке'
        verbose_name_plural = 'Отметки преподавателей на карточках'
        unique_together = ['card', 'teacher']
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.teacher.email} - {self.card.title}"



