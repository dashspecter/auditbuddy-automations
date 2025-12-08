import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Filter, Star, Download, TrendingUp, Clock, 
  Sparkles, ChevronRight, Package, BookOpen, Wrench, GraduationCap,
  Share2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useMarketplaceTemplates, 
  useMarketplaceCategories,
  useFeaturedTemplates,
  usePopularTemplates,
  useNewThisWeekTemplates,
  TemplateFilter,
  MarketplaceTemplate 
} from "@/hooks/useMarketplace";
import { useIndustries } from "@/hooks/useIndustries";

const templateTypeIcons = {
  audit: BookOpen,
  sop: Package,
  maintenance: Wrench,
  training: GraduationCap,
};

const templateTypeLabels = {
  audit: "Audit Template",
  sop: "SOP Checklist",
  maintenance: "Maintenance Flow",
  training: "Training Program",
};

function TemplateCard({ template, onClick }: { template: MarketplaceTemplate; onClick: () => void }) {
  const Icon = templateTypeIcons[template.template_type] || Package;
  
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 overflow-hidden"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <Badge variant="secondary" className="text-xs">
              {templateTypeLabels[template.template_type]}
            </Badge>
          </div>
          {template.is_featured && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          {template.is_ai_generated && (
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
          {template.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {template.description || "No description provided"}
        </p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {template.average_rating?.toFixed(1) || "0.0"}
            <span className="text-muted-foreground/60">({template.rating_count})</span>
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {template.download_count}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          by <span className="font-medium">{template.author_name}</span>
        </div>
        <div className="flex items-center gap-1">
          {template.industry && (
            <Badge variant="outline" className="text-xs">
              {template.industry.name}
            </Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

function TemplateSection({ 
  title, 
  icon: Icon, 
  templates, 
  isLoading,
  onViewAll,
  showViewAll = true 
}: { 
  title: string; 
  icon: React.ElementType;
  templates?: MarketplaceTemplate[];
  isLoading: boolean;
  onViewAll?: () => void;
  showViewAll?: boolean;
}) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-1" />
              </CardContent>
              <CardFooter className="pt-3 border-t">
                <Skeleton className="h-4 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!templates?.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        {showViewAll && onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templates.slice(0, 4).map((template) => (
          <TemplateCard 
            key={template.id} 
            template={template}
            onClick={() => navigate(`/marketplace/template/${template.slug}`)}
          />
        ))}
      </div>
    </div>
  );
}

export default function MarketplaceBrowse() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TemplateFilter>({ sort: 'popular' });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: categories } = useMarketplaceCategories();
  const { data: industries } = useIndustries();
  const { data: featuredTemplates, isLoading: loadingFeatured } = useFeaturedTemplates();
  const { data: popularTemplates, isLoading: loadingPopular } = usePopularTemplates();
  const { data: newTemplates, isLoading: loadingNew } = useNewThisWeekTemplates();
  const { data: allTemplates, isLoading: loadingAll } = useMarketplaceTemplates({
    ...filters,
    search: searchQuery,
    type: activeTab !== 'all' ? activeTab : undefined,
  });

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Template Marketplace
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover and install ready-to-use templates from industry experts. 
              Audit checklists, SOPs, maintenance flows, and training programs.
            </p>
            
            {/* Search Bar */}
            <div className="flex gap-2 max-w-xl mx-auto mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search templates..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Featured Templates */}
        <TemplateSection
          title="Featured Templates"
          icon={Sparkles}
          templates={featuredTemplates}
          isLoading={loadingFeatured}
          onViewAll={() => setFilters({ featured: true, sort: 'popular' })}
        />

        {/* Popular Templates */}
        <TemplateSection
          title="Most Popular"
          icon={TrendingUp}
          templates={popularTemplates}
          isLoading={loadingPopular}
          onViewAll={() => setFilters({ sort: 'popular' })}
        />

        {/* New This Week */}
        <TemplateSection
          title="New This Week"
          icon={Clock}
          templates={newTemplates}
          isLoading={loadingNew}
          onViewAll={() => setFilters({ sort: 'newest' })}
        />

        {/* Browse All */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Browse All Templates</h2>
            <div className="flex items-center gap-2">
              <Select 
                value={filters.industryId || "all"} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, industryId: v === 'all' ? undefined : v }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries?.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={filters.categoryId || "all"} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, categoryId: v === 'all' ? undefined : v }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.sort || "popular"} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, sort: v as any }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Types</TabsTrigger>
              <TabsTrigger value="audit">Audit Templates</TabsTrigger>
              <TabsTrigger value="sop">SOP Checklists</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance Flows</TabsTrigger>
              <TabsTrigger value="training">Training Programs</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Templates Grid */}
          {loadingAll ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                  <CardFooter className="pt-3 border-t">
                    <Skeleton className="h-4 w-20" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : allTemplates?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allTemplates.map((template) => (
                <TemplateCard 
                  key={template.id} 
                  template={template}
                  onClick={() => navigate(`/marketplace/template/${template.slug}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No templates found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>

        {/* CTA for Publishing */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Share Your Expertise</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Have a template that works great for your business? Publish it to the marketplace 
            and help others in your industry succeed.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/marketplace/publish")}>
              <Share2 className="h-4 w-4 mr-2" />
              Publish a Template
            </Button>
            <Button variant="outline" onClick={() => navigate("/marketplace/my-templates")}>
              My Templates
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
