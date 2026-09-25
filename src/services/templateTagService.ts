import { supabase } from '../supabase/client';

export interface TemplateTag {
  id: string;
  name: string;
}

type ServiceResult<T> = { data: T | null; error: string | null };

export function normalizeTemplateTagName(value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  return normalized
    ? `${normalized.charAt(0).toLocaleUpperCase()}${normalized.slice(1)}`
    : '';
}

export async function fetchTemplateTags(userId: string): Promise<ServiceResult<TemplateTag[]>> {
  const { data, error } = await supabase
    .from('template_tags')
    .select('id, name')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  return error
    ? { data: null, error: 'Failed to load template tags.' }
    : { data: (data ?? []) as TemplateTag[], error: null };
}

export async function createTemplateTag({
  name,
  userId,
}: {
  name: string;
  userId: string;
}): Promise<ServiceResult<TemplateTag>> {
  const normalizedName = normalizeTemplateTagName(name);
  if (!normalizedName || normalizedName.length > 30) {
    return { data: null, error: 'Tag names must be between 1 and 30 characters.' };
  }

  const { data, error } = await supabase
    .from('template_tags')
    .insert({ name: normalizedName, user_id: userId })
    .select('id, name')
    .single();

  if (error?.code === '23505') {
    return { data: null, error: 'A tag with that name already exists.' };
  }

  return error || !data
    ? { data: null, error: 'Failed to create template tag.' }
    : { data: data as TemplateTag, error: null };
}

export async function renameTemplateTag({
  id,
  name,
  userId,
}: {
  id: string;
  name: string;
  userId: string;
}): Promise<ServiceResult<TemplateTag>> {
  const normalizedName = normalizeTemplateTagName(name);
  if (!normalizedName || normalizedName.length > 30) {
    return { data: null, error: 'Tag names must be between 1 and 30 characters.' };
  }

  const { data, error } = await supabase
    .from('template_tags')
    .update({ name: normalizedName })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, name')
    .single();

  if (error?.code === '23505') {
    return { data: null, error: 'A tag with that name already exists.' };
  }

  return error || !data
    ? { data: null, error: 'Failed to rename template tag.' }
    : { data: data as TemplateTag, error: null };
}

export async function deleteTemplateTag({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<ServiceResult<true>> {
  const { error } = await supabase
    .from('template_tags')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return error
    ? { data: null, error: 'Failed to delete template tag.' }
    : { data: true, error: null };
}

export async function saveTemplateTags({
  tagIds,
  templateId,
}: {
  tagIds: string[];
  templateId: string;
}): Promise<ServiceResult<true>> {
  const { error } = await supabase.rpc('set_template_tags', {
    selected_tag_ids: tagIds,
    target_template_id: templateId,
  });

  return error
    ? { data: null, error: 'Failed to save template tags.' }
    : { data: true, error: null };
}

export async function saveTemplateOrder(templateIds: string[]): Promise<ServiceResult<true>> {
  const { error } = await supabase.rpc('reorder_templates', {
    ordered_template_ids: templateIds,
  });

  return error
    ? { data: null, error: 'Failed to save template order.' }
    : { data: true, error: null };
}
