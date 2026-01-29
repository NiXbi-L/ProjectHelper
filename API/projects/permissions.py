from rest_framework import permissions


class IsTeamMember(permissions.BasePermission):
    """Разрешение для участника команды"""
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'team'):
            team = obj.team
            return team.team_members.filter(user=request.user, is_confirmed=True).exists()
        if hasattr(obj, 'team_members'):
            return obj.team_members.filter(user=request.user, is_confirmed=True).exists()
        return False


class IsTeamLeader(permissions.BasePermission):
    """Разрешение только для тимлида команды"""
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'team'):
            team = obj.team
            return team.team_members.filter(user=request.user, role='team_leader', is_confirmed=True).exists()
        if hasattr(obj, 'team_members'):
            return obj.team_members.filter(user=request.user, role='team_leader', is_confirmed=True).exists()
        return False


class IsProjectTeamMember(permissions.BasePermission):
    """Разрешение для участника команды проекта или преподавателя"""
    
    def has_object_permission(self, request, view, obj):
        # Преподаватели имеют доступ ко всем проектам
        if request.user.is_staff or getattr(request.user, 'is_teacher', False):
            return True
        # Обычные пользователи - только участники команды
        if hasattr(obj, 'project'):
            project = obj.project
            return project.team.team_members.filter(user=request.user, is_confirmed=True).exists()
        if hasattr(obj, 'team'):
            return obj.team.team_members.filter(user=request.user, is_confirmed=True).exists()
        return False


class IsTeacher(permissions.BasePermission):
    """Разрешение для преподавателя (проверка через is_staff или отдельное поле)"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or getattr(request.user, 'is_teacher', False))
    
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (request.user.is_staff or getattr(request.user, 'is_teacher', False))
