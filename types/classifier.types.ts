/**
 * Type definitions for Instagram artist classification
 * Used in artist_recommendations.classifier_result JSONB column
 */

export interface ClassifierResultRecord {
  passed: boolean;
  method: 'bio' | 'image' | 'error' | 'duplicate';
  confidence: number;
  details: string;
  bio?: string;
  follower_count?: number;
  instagram_id?: string;
}
