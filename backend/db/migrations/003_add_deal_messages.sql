-- Migration 003: Create deal_messages table for accepted applications deal-room planning
-- SharkBridge Certified end-to-end deal messaging

CREATE TABLE IF NOT EXISTS public.deal_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.funding_applications(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_name TEXT,
    sender_role TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid room conversation retrieval
CREATE INDEX IF NOT EXISTS idx_deal_messages_app_id ON public.deal_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_deal_messages_created_at ON public.deal_messages(created_at);

-- RLS policies
ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can read messages" ON public.deal_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.funding_applications fa
            WHERE fa.id = deal_messages.application_id
              AND (fa.entrepreneur_id = auth.uid() OR fa.investor_id = auth.uid())
        )
    );

CREATE POLICY "Deal participants can insert messages" ON public.deal_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.funding_applications fa
            WHERE fa.id = deal_messages.application_id
              AND fa.status = 'interested'
              AND (fa.entrepreneur_id = auth.uid() OR fa.investor_id = auth.uid())
        )
    );
