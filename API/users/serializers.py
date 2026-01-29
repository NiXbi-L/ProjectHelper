from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор пользователя"""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'avatar', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserProfileSerializer(serializers.ModelSerializer):
    """Сериализатор профиля пользователя"""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'avatar', 'date_joined', 'is_staff']
        read_only_fields = ['id', 'email', 'username', 'date_joined', 'is_staff']


class RegisterSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label='Подтверждение пароля')
    
    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})
        
        # Проверка домена @dvfu.ru
        email = attrs.get('email', '')
        if not email.endswith('@dvfu.ru'):
            raise serializers.ValidationError({"email": "Email должен быть в формате @dvfu.ru"})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['email'],  # Используем email как username
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        return user


class TeacherRegisterSerializer(RegisterSerializer):
    """Сериализатор для регистрации преподавателя"""
    teacher_key = serializers.CharField(write_only=True, required=True, label='Ключ регистрации преподавателя')
    
    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ['teacher_key']
    
    def validate(self, attrs):
        # Вызываем валидацию родительского класса
        attrs = super().validate(attrs)
        
        # Проверяем ключ регистрации преподавателя
        from django.conf import settings
        teacher_key = attrs.get('teacher_key')
        expected_key = getattr(settings, 'TEACHER_REGISTRATION_KEY', 'teacher-secret-key-change-in-production')
        
        if teacher_key != expected_key:
            raise serializers.ValidationError({"teacher_key": "Неверный ключ регистрации преподавателя"})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('teacher_key')
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_staff=True,  # Устанавливаем is_staff=True для преподавателей
        )
        return user


class LoginSerializer(serializers.Serializer):
    """Сериализатор для входа"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
