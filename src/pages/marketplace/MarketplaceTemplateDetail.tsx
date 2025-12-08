import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Star, Download, Share2, Copy, Check, ArrowLeft,
  BookOpen, Package, Wrench, GraduationCap, Calendar,
  User, Building, Sparkles, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  useMarketplaceTemplate, 
  useTemplateRatings,
  useMyTemplateRating,
  useRateTemplate,
  useInstallMarketplaceTemplate 
} from "@/hooks/useMarketplace";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function StarRating({ 
  rating, 
  onChange, 
  readonly = false,
  size = 'md' 
}: { 
  rating: number; 
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? '' : 'cursor-pointer hover:scale-110'} transition-transform`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => onChange?.(star)}
        >
          <Star 
            className={`${sizeClasses[size]} ${
              star <= (hovered || rating) 
                ? 'fill-amber-400 text-amber-400' 
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function MarketplaceTemplateDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyQuery = useCompany();
  const company = companyQuery.data;
  
  const { data: template, isLoading } = useMarketplaceTemplate(slug || "");
  const { data: ratings } = useTemplateRatings(template?.id || "");
  const { data: myRating } = useMyTemplateRating(template?.id || "");
  const rateTemplate = useRateTemplate();
  const installTemplate = useInstallMarketplaceTemplate();

  const [copied, setCopied] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [userRating, setUserRating] = useState(myRating?.rating || 0);
  const [userReview, setUserReview] = useState(myRating?.review || "");

  const Icon = template ? templateTypeIcons[template.template_type] : Package;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/marketplace/share/${template?.share_token}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: template?.title,
          text: template?.description || "Check out this template!",
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInstall = async () => {
    if (!user) {
      toast.error("Please log in to install templates");
      navigate("/auth");
      return;
    }
    
    if (!template) return;

    try {
      await installTemplate.mutateAsync({
        templateId: template.id,
        companyId: company?.id,
      });
      setShowInstallDialog(false);
      toast.success("Template installed successfully!");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSubmitRating = async () => {
    if (!template) return;
    
    try {
      await rateTemplate.mutateAsync({
        templateId: template.id,
        rating: userRating,
        review: userReview || undefined,
      });
      setShowRatingDialog(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Template not found</h1>
        <p className="text-muted-foreground mt-2">This template may have been removed or doesn't exist.</p>
        <Button className="mt-4" onClick={() => navigate("/marketplace")}>
          Browse Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/marketplace")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <Badge variant="secondary">
              {templateTypeLabels[template.template_type]}
            </Badge>
            {template.is_featured && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
            {template.is_ai_generated && (
              <Badge variant="outline">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Generated
              </Badge>
            )}
            {template.industry && (
              <Badge variant="outline">{template.industry.name}</Badge>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold">{template.title}</h1>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <StarRating rating={template.average_rating || 0} readonly size="sm" />
              <span className="ml-1">{template.average_rating?.toFixed(1) || "0.0"}</span>
              <span>({template.rating_count} reviews)</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              {template.download_count} downloads
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              by {template.author_name}
              {template.author_company_name && (
                <>
                  <Building className="h-4 w-4 ml-2" />
                  {template.author_company_name}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {template.description || "No description provided."}
                </p>
              </CardContent>
            </Card>

            {/* Template Preview */}
            {template.content && (
              <Card>
                <CardHeader>
                  <CardTitle>Template Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(template.content, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Reviews ({template.rating_count})</CardTitle>
                {user && (
                  <Button variant="outline" size="sm" onClick={() => setShowRatingDialog(true)}>
                    {myRating ? "Update Review" : "Write a Review"}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {ratings?.length ? (
                  <div className="space-y-4">
                    {ratings.map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <StarRating rating={review.rating} readonly size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        {review.review && (
                          <p className="text-sm text-muted-foreground">{review.review}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No reviews yet. Be the first to review this template!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setShowInstallDialog(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install Template
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleShare}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Template
                    </>
                  )}
                </Button>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium">{template.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{template.category?.name || "Uncategorized"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Published</span>
                    <span className="font-medium">
                      {template.published_at 
                        ? format(new Date(template.published_at), "MMM d, yyyy")
                        : "N/A"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">
                      {format(new Date(template.updated_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Author Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About the Author</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{template.author_name}</p>
                    {template.author_company_name && (
                      <p className="text-sm text-muted-foreground">{template.author_company_name}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Install Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Template</DialogTitle>
            <DialogDescription>
              This will add "{template.title}" to your company's templates.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              The template will be copied to your account and you can customize it as needed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstallDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInstall} disabled={installTemplate.isPending}>
              {installTemplate.isPending ? "Installing..." : "Install Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate this Template</DialogTitle>
            <DialogDescription>
              Share your experience with this template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <StarRating 
                rating={userRating} 
                onChange={setUserRating}
                size="lg"
              />
            </div>
            <Textarea
              placeholder="Write a review (optional)"
              value={userReview}
              onChange={(e) => setUserReview(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRatingDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitRating} 
              disabled={!userRating || rateTemplate.isPending}
            >
              {rateTemplate.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
