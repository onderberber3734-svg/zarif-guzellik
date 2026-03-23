-- salons tablosuna inactive_until sütununu ekle
-- Eğer sütun zaten varsa hata vermez (IF NOT EXISTS kullanımı)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='salons' AND column_name='inactive_until') THEN
        ALTER TABLE public.salons ADD COLUMN inactive_until DATE DEFAULT NULL;
    END IF;
END $$;

-- Supabase'in şema önbelleğini (schema cache) yenilemesi için kullanılan standart bir komut
NOTIFY pgrst, 'reload schema';
