import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLanguage, SupportedLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
}

export const LanguageSwitcher = ({ 
  className, 
  variant = 'ghost',
  showLabel = true 
}: LanguageSwitcherProps) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languages, isLoading } = useLanguage();

  const currentLang = languages.find(l => l.code === currentLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size="sm" 
          className={cn("gap-2", className)}
          disabled={isLoading}
        >
          <Globe className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline">
              {currentLang?.flag} {currentLang?.label}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              "cursor-pointer gap-2",
              currentLanguage === lang.code && "bg-accent"
            )}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
