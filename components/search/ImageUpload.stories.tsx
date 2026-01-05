import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import ImageUpload from './ImageUpload';

const meta: Meta<typeof ImageUpload> = {
  title: 'Components/Search/ImageUpload',
  component: ImageUpload,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ImageUpload>;

/**
 * Default empty dropzone - ready for image upload
 */
export const Default: Story = {
  render: () => {
    const Wrapper = () => {
      const [, setImage] = useState<{ file: File | null; preview: string }>({
        file: null,
        preview: '',
      });
      return (
        <ImageUpload
          onImageSelect={(file, preview) => setImage({ file, preview })}
        />
      );
    };
    return <Wrapper />;
  },
};

/**
 * With image preview - shows uploaded image with file info and remove option
 */
export const WithPreview: Story = {
  render: () => {
    const Wrapper = () => {
      const [image, setImage] = useState<{ file: File | null; preview: string }>({
        file: new File([''], 'tattoo-reference.jpg', { type: 'image/jpeg' }),
        preview: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400&h=400&fit=crop',
      });
      return (
        <ImageUpload
          onImageSelect={(file, preview) => setImage({ file, preview })}
          currentImage={image.file}
          currentPreview={image.preview}
        />
      );
    };
    return <Wrapper />;
  },
};

/**
 * Compact mode - smaller dropzone for homepage use
 */
export const Compact: Story = {
  render: () => {
    const Wrapper = () => {
      const [, setImage] = useState<{ file: File | null; preview: string }>({
        file: null,
        preview: '',
      });
      return (
        <ImageUpload
          onImageSelect={(file, preview) => setImage({ file, preview })}
          compact
        />
      );
    };
    return <Wrapper />;
  },
};

/**
 * Compact with preview - shows compact preview state
 */
export const CompactWithPreview: Story = {
  render: () => {
    const Wrapper = () => {
      const [image, setImage] = useState<{ file: File | null; preview: string }>({
        file: new File([''], 'tattoo-reference.jpg', { type: 'image/jpeg' }),
        preview: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400&h=400&fit=crop',
      });
      return (
        <ImageUpload
          onImageSelect={(file, preview) => setImage({ file, preview })}
          currentImage={image.file}
          currentPreview={image.preview}
          compact
        />
      );
    };
    return <Wrapper />;
  },
};

/**
 * Interactive demo - try uploading an image
 */
export const InteractiveDemo: Story = {
  render: () => {
    const Wrapper = () => {
      const [image, setImage] = useState<{ file: File | null; preview: string }>({
        file: null,
        preview: '',
      });
      return (
        <div className="space-y-6">
          <div className="bg-gray-100 p-6 rounded border border-gray-300">
            <h3 className="font-display text-2xl mb-4 text-ink">Features:</h3>
            <ul className="font-body space-y-2 text-gray-700">
              <li>• Click to open file picker</li>
              <li>• Drag and drop images onto the dropzone</li>
              <li>• Supports JPEG, PNG, WebP (max 10MB)</li>
              <li>• Shows preview after upload</li>
              <li>• Remove button to clear selection</li>
            </ul>
          </div>
          <ImageUpload
            onImageSelect={(file, preview) => setImage({ file, preview })}
            currentImage={image.file}
            currentPreview={image.preview}
          />
          {image.file && (
            <div className="text-sm text-gray-500 font-mono">
              Selected: {image.file.name}
            </div>
          )}
        </div>
      );
    };
    return <Wrapper />;
  },
};

/**
 * Size comparison - default vs compact
 */
export const SizeComparison: Story = {
  render: () => {
    const Wrapper = () => {
      const [, setImage] = useState<{ file: File | null; preview: string }>({
        file: null,
        preview: '',
      });
      return (
        <div className="space-y-8">
          <div>
            <h3 className="font-display text-xl mb-4 text-ink">Default Size</h3>
            <ImageUpload
              onImageSelect={(file, preview) => setImage({ file, preview })}
            />
          </div>
          <div>
            <h3 className="font-display text-xl mb-4 text-ink">Compact Size</h3>
            <ImageUpload
              onImageSelect={(file, preview) => setImage({ file, preview })}
              compact
            />
          </div>
        </div>
      );
    };
    return <Wrapper />;
  },
};

/**
 * On dark background
 */
export const OnDarkBackground: Story = {
  render: () => {
    const Wrapper = () => {
      const [, setImage] = useState<{ file: File | null; preview: string }>({
        file: null,
        preview: '',
      });
      return (
        <ImageUpload
          onImageSelect={(file, preview) => setImage({ file, preview })}
        />
      );
    };
    return <Wrapper />;
  },
  parameters: {
    backgrounds: { default: 'ink' },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl p-8 bg-ink rounded-lg">
        <Story />
      </div>
    ),
  ],
};
