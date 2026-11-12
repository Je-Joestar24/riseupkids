/**
 * The smaller pieces of the Experience editor on their own: the message after a failed save, the Save bar, the
 * status card, the picture picker, the text-box footer, and the details and printable cards.
 */
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../config/theme';
import ExperienceSaveBanner from './ExperienceSaveBanner';
import ExperienceSaveBar from './ExperienceSaveBar';
import ExperienceStatusCard from './ExperienceStatusCard';
import ExperienceDetailsSection from './ExperienceDetailsSection';
import { ExperienceCoverCard, ExperiencePrintableCard } from './ExperiencePicturesCards';
import FieldFooter from './FieldFooter';
import ImagePicker from './ImagePicker';
import DocumentPicker from './DocumentPicker';
import VideoPreviewDialog from './VideoPreviewDialog';

const wrap = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

beforeAll(() => {
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

const none = { url: null, file: null, remove: false };
const noDocument = { url: null, name: '', file: null, remove: false };
const linkSource = { source: 'link', link: '', button: '' };
const png = (name = 'a.png') => new File(['x'], name, { type: 'image/png' });

describe('ExperienceSaveBanner', () => {
  const banner = (kind, extra = {}) => ({ kind, message: 'The message.', reasons: [], ...extra });

  it('shows nothing when there is nothing to say', () => {
    const { container } = wrap(<ExperienceSaveBanner banner={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('a refusal says what to do and lists the reasons that belong to no field', () => {
    wrap(<ExperienceSaveBanner banner={banner('validation', { message: 'Please fix the highlighted fields.', reasons: ['First reason.', 'Second reason.'] })} />);
    expect(screen.getByText('Please fix the highlighted fields.')).toBeInTheDocument();
    expect(screen.getByText('Check the fields marked in red.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['First reason.', 'Second reason.']);
  });

  it('a blocked publish is a warning that tells how to save it as a draft', () => {
    wrap(<ExperienceSaveBanner banner={banner('publish', { message: 'This experience cannot be published yet.' })} />);
    expect(screen.getByText('This experience cannot be published yet.')).toBeInTheDocument();
    expect(screen.getByText('Add what is missing, or turn Published off to save it as a draft.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardWarning');
  });

  it('any other failure is an error that says the experience was not saved, with the reason', () => {
    wrap(<ExperienceSaveBanner banner={banner('error', { message: 'Server is down.' })} />);
    expect(screen.getByText('The experience was not saved')).toBeInTheDocument();
    expect(screen.getByText('Server is down.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
  });

  it('can be dismissed', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceSaveBanner banner={banner('error')} onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('someone else saving first offers to load theirs or to save yours, and is blocked while saving', async () => {
    const onLoadTheirs = vi.fn();
    const onOverwrite = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceSaveBanner banner={banner('conflict')} onLoadTheirs={onLoadTheirs} onOverwrite={onOverwrite} />);
    expect(screen.getByText('Someone else saved this experience first')).toBeInTheDocument();
    expect(screen.getByText(/Loading their version replaces what you typed; saving yours replaces their changes\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load their version' }));
    await user.click(screen.getByRole('button', { name: 'Save mine anyway' }));
    expect(onLoadTheirs).toHaveBeenCalledTimes(1);
    expect(onOverwrite).toHaveBeenCalledTimes(1);
    cleanup();
    wrap(<ExperienceSaveBanner banner={banner('conflict')} saving onLoadTheirs={onLoadTheirs} onOverwrite={onOverwrite} />);
    expect(screen.getByRole('button', { name: 'Load their version' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save mine anyway' })).toBeDisabled();
  });

  it('a deleted experience offers the way back', async () => {
    const onBackToList = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceSaveBanner banner={banner('notFound', { message: 'It was deleted.' })} onBackToList={onBackToList} />);
    expect(screen.getByText('Experience not found')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to experiences' }));
    expect(onBackToList).toHaveBeenCalledTimes(1);
  });
});

describe('ExperienceSaveBar', () => {
  const bar = (props) => wrap(<ExperienceSaveBar isEdit={false} dirty={false} saving={false} onCancel={() => {}} onSave={() => {}} {...props} />);

  it('a new experience: "Create experience" is always available, and there is no status until something changes', () => {
    bar({});
    expect(screen.getByRole('button', { name: 'Create experience' })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('');
    cleanup();
    bar({ dirty: true });
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes');
  });

  it('an experience being edited: "Save changes" waits for a change', () => {
    bar({ isEdit: true });
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('No changes yet');
    cleanup();
    bar({ isEdit: true, dirty: true });
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('while saving it says so and blocks both buttons', () => {
    bar({ isEdit: true, dirty: true, saving: true });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Saving…');
  });

  it('Cancel and Save tell the page', async () => {
    const onCancel = vi.fn();
    const onSave = vi.fn();
    const user = userEvent.setup();
    bar({ onCancel, onSave });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Create experience' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe('ExperienceStatusCard', () => {
  it('a draft says children cannot see it, and tells the page when the switch is turned', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceStatusCard isPublished={false} missing={['a title']} onChange={onChange} />);
    expect(screen.getByRole('checkbox', { name: 'Published' })).not.toBeChecked();
    expect(screen.getByText('A draft. Children cannot see it yet.')).toBeInTheDocument();
    expect(screen.queryByText(/To publish it/)).not.toBeInTheDocument(); // a draft is not warned
    await user.click(screen.getByRole('checkbox', { name: 'Published' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('a published one says children can see it, and the switch turns it off', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceStatusCard isPublished missing={[]} onChange={onChange} />);
    expect(screen.getByText('Children can see it under Explore.')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Published' }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('names what is missing, joined with "and"', () => {
    wrap(<ExperienceStatusCard isPublished missing={['a title', 'at least one video']} onChange={() => {}} />);
    expect(screen.getByText(/To publish it, add a title and at least one video\./)).toBeInTheDocument();
  });

  it('shows when it was last changed, only when it is known', () => {
    wrap(<ExperienceStatusCard isPublished={false} updatedAt="2026-11-10T10:00:00.000Z" onChange={() => {}} />);
    expect(screen.getByText('Updated 10 Nov 2026')).toBeInTheDocument();
    cleanup();
    wrap(<ExperienceStatusCard isPublished={false} updatedAt={null} onChange={() => {}} />);
    expect(screen.queryByText(/^Updated/)).not.toBeInTheDocument();
  });
});

describe('ImagePicker', () => {
  const picker = (props) => wrap(<ImagePicker id="pic" label="Cover picture" picture={none} onPick={() => {}} onRemove={() => {}} {...props} />);

  it('with no picture: says so, offers to choose one, and offers no Remove', () => {
    picker({});
    expect(screen.getByText('No picture')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose picture' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('only offers the picture types the server accepts', () => {
    picker({});
    expect(screen.getByLabelText('Cover picture file')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });

  it('a saved picture is shown, and can be replaced or removed', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    picker({ picture: { url: 'https://cdn/c.png', file: null, remove: false }, onRemove });
    expect(screen.getByAltText('Cover picture preview')).toHaveAttribute('src', 'https://cdn/c.png');
    expect(screen.getByRole('button', { name: 'Replace picture' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('a picture marked to be removed shows nothing', () => {
    picker({ picture: { url: 'https://cdn/c.png', file: null, remove: true } });
    expect(screen.queryByAltText('Cover picture preview')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose picture' })).toBeInTheDocument();
  });

  it('a chosen file is shown from memory, and given back to the page', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    const { rerender } = picker({ onPick });
    const file = png('new.png');
    await user.upload(screen.getByLabelText('Cover picture file'), file);
    expect(onPick).toHaveBeenCalledWith(file);
    rerender(
      <ThemeProvider theme={theme}>
        <ImagePicker id="pic" label="Cover picture" picture={{ url: null, file, remove: false }} onPick={onPick} onRemove={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByAltText('Cover picture preview')).toHaveAttribute('src', 'blob:new.png');
  });

  it('a picture that does not load shows a message instead of a broken image, and a new address gets another try', () => {
    const { rerender } = picker({ picture: { url: 'https://cdn/broken.png', file: null, remove: false } });
    fireEvent.error(screen.getByAltText('Cover picture preview'));
    expect(screen.getByText('The picture could not be shown')).toBeInTheDocument();
    rerender(
      <ThemeProvider theme={theme}>
        <ImagePicker id="pic" label="Cover picture" picture={{ url: 'https://cdn/fixed.png', file: null, remove: false }} onPick={() => {}} onRemove={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByAltText('Cover picture preview')).toHaveAttribute('src', 'https://cdn/fixed.png');
  });

  it('shows the hint, or the problem instead of it', () => {
    picker({ hint: 'JPG, PNG or WebP, up to 8 MB.' });
    expect(screen.getByText('JPG, PNG or WebP, up to 8 MB.')).toBeInTheDocument();
    cleanup();
    picker({ hint: 'JPG, PNG or WebP, up to 8 MB.', error: 'The picture is too large. The maximum size is 8 MB.' });
    expect(screen.queryByText('JPG, PNG or WebP, up to 8 MB.')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The picture is too large.');
  });

  it('releases the memory of a chosen picture when it goes away', () => {
    const file = png('gone.png');
    const view = picker({ picture: { url: null, file, remove: false } });
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:gone.png');
  });
});

describe('FieldFooter', () => {
  it('shows the hint, or the problem instead of it, and a problem is announced', () => {
    wrap(<FieldFooter id="f" hint="A hint." />);
    expect(screen.getByText('A hint.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    cleanup();
    wrap(<FieldFooter id="f" hint="A hint." error="A problem." />);
    expect(screen.queryByText('A hint.')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('A problem.');
  });

  it('shows the count, red only when over the limit', () => {
    wrap(<FieldFooter id="f" length={200} max={200} />);
    expect(screen.getByLabelText('200 of 200 characters')).not.toHaveClass('Mui-error');
    cleanup();
    wrap(<FieldFooter id="f" length={201} max={200} />);
    expect(screen.getByLabelText('201 of 200 characters')).toHaveClass('Mui-error');
  });

  it('shows no count when it is not asked for', () => {
    wrap(<FieldFooter id="f" hint="x" />);
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });
});

describe('ExperienceDetailsSection', () => {
  it('shows both boxes, tells the page what was typed, and marks the box that has a problem', () => {
    const onChange = vi.fn();
    wrap(<ExperienceDetailsSection title="T" description="D" titleError="Title is required." onChange={onChange} />);
    expect(screen.getByLabelText('Title')).toBeInvalid();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Description')).toBeValid();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Text' } });
    expect(onChange).toHaveBeenCalledWith('title', 'New');
    expect(onChange).toHaveBeenCalledWith('description', 'Text');
  });

  it('points each box at its own note', () => {
    wrap(<ExperienceDetailsSection title="T" description="D" onChange={() => {}} />);
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-describedby', 'experience-title-note');
    expect(screen.getByLabelText('Description')).toHaveAttribute('aria-describedby', 'experience-description-note');
  });
});

describe('the pictures cards', () => {
  it('the cover card gives the picked file and the removal to the page', async () => {
    const onPick = vi.fn();
    const onRemove = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceCoverCard picture={{ url: 'https://cdn/c.png', file: null, remove: false }} onPick={onPick} onRemove={onRemove} />);
    const file = png('c.png');
    await user.upload(screen.getByLabelText('Cover picture file'), file);
    expect(onPick).toHaveBeenCalledWith(file);
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('the printable card says it is optional, and keeps the link, the button and the picture apart', async () => {
    const onChange = vi.fn();
    const onPick = vi.fn();
    const user = userEvent.setup();
    wrap(
      <ExperiencePrintableCard
        printable={{ source: 'link', link: 'https://riseup.kids/a.pdf', button: 'Go' }}
        picture={none}
        document={noDocument}
        linkError="Printable link must use https."
        buttonError="Too long."
        pictureError="Too big."
        onChange={onChange}
        onPick={onPick}
        onRemove={() => {}}
      />
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.getByLabelText('Link to the file')).toBeInvalid();
    expect(screen.getByLabelText('Button text')).toBeInvalid();
    expect(screen.getByText('Too big.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Link to the file'), { target: { value: 'https://riseup.kids/b.pdf' } });
    fireEvent.change(screen.getByLabelText('Button text'), { target: { value: 'Print' } });
    expect(onChange).toHaveBeenCalledWith('link', 'https://riseup.kids/b.pdf');
    expect(onChange).toHaveBeenCalledWith('button', 'Print');
    const file = png('p.png');
    await user.upload(screen.getByLabelText('Printable picture file'), file);
    expect(onPick).toHaveBeenCalledWith(file);
  });

  it('explains the button text default and the link rule', () => {
    wrap(<ExperiencePrintableCard printable={linkSource} picture={none} document={noDocument} onChange={() => {}} onPick={() => {}} onRemove={() => {}} />);
    expect(screen.getByText('A file on our own website (riseup.kids), starting with https.')).toBeInTheDocument();
    expect(screen.getByText(/Empty shows/)).toBeInTheDocument();
  });
});

describe('VideoPreviewDialog', () => {
  it('is closed, and loads nothing, until there is a video', () => {
    wrap(<VideoPreviewDialog video={null} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('plays the video it is given, titled with its name, and tells when it is closed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    wrap(<VideoPreviewDialog video={{ title: 'The story', url: 'https://iframe.mediadelivery.net/embed/1/a' }} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'The story' });
    expect(within(dialog).getByTitle('Preview of The story')).toHaveAttribute('src', 'https://iframe.mediadelivery.net/embed/1/a');
    await user.click(within(dialog).getByRole('button', { name: 'Close preview' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('DocumentPicker', () => {
  const pdf = (name = 'Recipe.pdf', size = 2048) => {
    const file = new File(['x'], name, { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };
  const picker = (props) =>
    wrap(<DocumentPicker id="doc" document={noDocument} onPick={() => {}} onRemove={() => {}} {...props} />);

  it('with no file: says so, offers to choose one, and offers no Remove', () => {
    picker({});
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('only offers PDF and Word documents', () => {
    picker({});
    const accept = screen.getByLabelText('Printable document').getAttribute('accept');
    expect(accept).toBe(
      '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('a saved file shows its name and a way to open it in a new tab, and can be replaced or removed', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    picker({ document: { url: 'https://cdn/r.pdf', name: 'Recipe.pdf', file: null, remove: false }, onRemove });
    expect(screen.getByText('Recipe.pdf')).toBeInTheDocument();
    const open = screen.getByRole('link', { name: 'Open it' });
    expect(open).toHaveAttribute('href', 'https://cdn/r.pdf');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open.getAttribute('rel')).toContain('noopener');
    expect(open.getAttribute('rel')).toContain('noreferrer');
    expect(screen.getByRole('button', { name: 'Replace file' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('a saved file with no name shows a plain one', () => {
    picker({ document: { url: 'https://cdn/r.pdf', name: '', file: null, remove: false } });
    expect(screen.getByText('Printable file')).toBeInTheDocument();
  });

  it('a file marked to be removed shows nothing', () => {
    picker({ document: { url: 'https://cdn/r.pdf', name: 'Recipe.pdf', file: null, remove: true } });
    expect(screen.queryByText('Recipe.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open it' })).not.toBeInTheDocument();
  });

  it('a chosen file shows its name and size, no "Open it", and is given back to the page', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    const { rerender } = picker({ onPick });
    const file = pdf('New.pdf', 350 * 1024);
    await user.upload(screen.getByLabelText('Printable document'), file);
    expect(onPick).toHaveBeenCalledWith(file);
    rerender(
      <ThemeProvider theme={theme}>
        <DocumentPicker id="doc" document={{ url: null, name: '', file, remove: false }} onPick={onPick} onRemove={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText('New.pdf')).toBeInTheDocument();
    expect(screen.getByText(/New file · 350 KB\. It is saved when you save the experience\./)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open it' })).not.toBeInTheDocument();
  });

  it('a chosen file wins over a saved one', () => {
    const file = pdf('New.pdf');
    picker({ document: { url: 'https://cdn/old.pdf', name: 'Old.pdf', file, remove: true } });
    expect(screen.getByText('New.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Old.pdf')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open it' })).not.toBeInTheDocument(); // the old file is not offered next to the new one
  });

  it('shows the hint, or the problem instead of it', () => {
    picker({ hint: 'PDF or Word (DOC, DOCX), up to 20 MB.' });
    expect(screen.getByText('PDF or Word (DOC, DOCX), up to 20 MB.')).toBeInTheDocument();
    cleanup();
    picker({ hint: 'PDF or Word (DOC, DOCX), up to 20 MB.', error: 'That file is empty.' });
    expect(screen.queryByText('PDF or Word (DOC, DOCX), up to 20 MB.')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('That file is empty.');
  });

  it('can choose the same file again after choosing it once', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    picker({ onPick });
    const file = pdf();
    await user.upload(screen.getByLabelText('Printable document'), file);
    await user.upload(screen.getByLabelText('Printable document'), file);
    expect(onPick).toHaveBeenCalledTimes(2);
  });
});

describe('the printable card: link or file', () => {
  const card = (props) =>
    wrap(
      <ExperiencePrintableCard
        printable={linkSource}
        picture={none}
        document={noDocument}
        onChange={() => {}}
        onSourceChange={() => {}}
        onPickDocument={() => {}}
        onRemoveDocument={() => {}}
        onPick={() => {}}
        onRemove={() => {}}
        {...props}
      />
    );

  it('has two radio buttons, "Link" and "Upload a file", and the chosen one is checked', () => {
    card({});
    const group = screen.getByRole('radiogroup', { name: 'What children print' });
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['link', 'file']);
    expect(screen.getByRole('radio', { name: 'Link' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Upload a file' })).not.toBeChecked();
    cleanup();
    card({ printable: { source: 'file', link: '', button: '' } });
    expect(screen.getByRole('radio', { name: 'Upload a file' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Link' })).not.toBeChecked();
  });

  it('tells the page which one was picked', async () => {
    const onSourceChange = vi.fn();
    const user = userEvent.setup();
    card({ onSourceChange });
    await user.click(screen.getByRole('radio', { name: 'Upload a file' }));
    expect(onSourceChange).toHaveBeenCalledWith('file');
  });

  it('"Link" shows the link box and not the file chooser; "Upload a file" the other way round', () => {
    card({});
    expect(screen.getByLabelText('Link to the file')).toBeInTheDocument();
    expect(screen.queryByLabelText('Printable document')).not.toBeInTheDocument();
    cleanup();
    card({ printable: { source: 'file', link: '', button: '' } });
    expect(screen.queryByLabelText('Link to the file')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Printable document')).toBeInTheDocument();
  });

  it('shows the file problem next to the file chooser', () => {
    card({ printable: { source: 'file', link: '', button: '' }, documentError: 'That file is empty.' });
    expect(screen.getByRole('alert')).toHaveTextContent('That file is empty.');
  });

  it('gives the file and its removal to the page', async () => {
    const onPickDocument = vi.fn();
    const onRemoveDocument = vi.fn();
    const user = userEvent.setup();
    card({
      printable: { source: 'file', link: '', button: '' },
      document: { url: 'https://cdn/r.pdf', name: 'Recipe.pdf', file: null, remove: false },
      onPickDocument,
      onRemoveDocument,
    });
    const file = new File(['x'], 'New.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Printable document'), file);
    expect(onPickDocument).toHaveBeenCalledWith(file);
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemoveDocument).toHaveBeenCalledTimes(1);
  });

  it('warns that a saved file goes when "Link" is chosen over it, and only then', () => {
    const saved = { url: 'https://cdn/r.pdf', name: 'Recipe.pdf', file: null, remove: false };
    card({ document: saved });
    expect(screen.getByRole('note')).toHaveTextContent('The file that is saved now (Recipe.pdf) is removed when you save.');
    cleanup();
    card({ document: noDocument });
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    cleanup();
    card({ printable: { source: 'file', link: '', button: '' }, document: saved });
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('a saved file with no name is called "printable file" in the warning', () => {
    card({ document: { url: 'https://cdn/r.pdf', name: '', file: null, remove: false } });
    expect(screen.getByRole('note')).toHaveTextContent('The file that is saved now (printable file) is removed when you save.');
  });

  it('the button text and the picture are there in both choices', () => {
    card({});
    expect(screen.getByLabelText('Button text')).toBeInTheDocument();
    expect(screen.getByLabelText('Printable picture file')).toBeInTheDocument();
    cleanup();
    card({ printable: { source: 'file', link: '', button: '' } });
    expect(screen.getByLabelText('Button text')).toBeInTheDocument();
    expect(screen.getByLabelText('Printable picture file')).toBeInTheDocument();
  });
});
