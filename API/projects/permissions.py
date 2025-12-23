from rest_framework import permissions


class IsProjectOwnerOrMember(permissions.BasePermission):
    """Разрешение для владельца или участника проекта"""
    
    def has_object_permission(self, request, view, obj):
        # Если объект связан с проектом через поле project
        if hasattr(obj, 'project'):
            project = obj.project
            return project.owner == request.user or project.members.filter(id=request.user.id).exists()
        # Если объект - это проект напрямую
        if hasattr(obj, 'owner') and hasattr(obj, 'members'):
            return obj.owner == request.user or obj.members.filter(id=request.user.id).exists()
        return False


class IsProjectOwner(permissions.BasePermission):
    """Разрешение только для владельца проекта"""
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        if hasattr(obj, 'project'):
            return obj.project.owner == request.user
        return False



