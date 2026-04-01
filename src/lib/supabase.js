import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vumtbezzljsurbupvtba.supabase.co';
const supabaseAnonKey = 'sb_publishable_Ki8rTFr9nIQjSOis32p1HA_mKYm4Eeg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
