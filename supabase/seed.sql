insert into sites (name,slug,description,business_type,domain,wordpress_url,primary_color,secondary_color,sender_name,sender_email,tokko_filter) values
('Area Prime','area-prime','Oficinas y edificios corporativos','Inmobiliario corporativo','areaprime.pe','https://areaprime.pe','#2563EB','#DBEAFE','Area Prime','novedades@areaprime.pe','{}'),
('Area Retail','area-retail','Locales comerciales y retail','Retail inmobiliario','arearetail.pe','https://arearetail.pe','#173B67','#DCE8F5','Area Retail','novedades@arearetail.pe','{}'),
('Area Hub','area-hub','Naves y propiedades industriales','Inmobiliario industrial','areahub.pe','https://areahub.pe','#EA6A27','#FDE8D8','Area Hub','novedades@areahub.pe','{}');
insert into site_integrations(site_id,provider) select id,p from sites cross join unnest(array['tokko','wordpress','resend']::integration_provider[]) p;
insert into automation_settings(site_id,type,frequency,day_of_week,day_of_month,send_time,requires_approval) select id,'weekly_new_properties','weekly',5,null,'09:00',false from sites union all select id,'monthly_properties','monthly',null,1,'10:00',true from sites union all select id,'monthly_blog','monthly',null,15,'10:00',true from sites;

insert into properties(site_id,external_id,title,description,property_type,location,address,price,currency,area,public_url,status,published_at,source_data)
select s.id,'MOCK-'||s.slug||'-'||n,s.name||' · Propiedad '||n,'Propiedad ficticia para desarrollo',case when s.slug='area-hub' then 'Industrial' when s.slug='area-retail' then 'Local' else 'Oficina' end,'Lima, Perú','Av. Principal 123',250000+n*18000,'USD',120+n*25,'https://'||s.domain||'/propiedad/'||n,'available',now()-make_interval(days=>n),'{}'
from sites s cross join generate_series(1,10) n on conflict(external_id) do nothing;

insert into blog_posts(site_id,external_id,title,excerpt,public_url,published_at,source_data)
select s.id,'WP-'||s.slug||'-'||n,'Artículo inmobiliario '||n,'Análisis y recomendaciones de nuestros especialistas.','https://'||s.domain||'/blog/'||n,now()-make_interval(days=>n),'{}'
from sites s cross join generate_series(1,5) n on conflict(site_id,external_id) do nothing;

insert into campaigns(site_id,automation_type,name,subject,status,recipient_count,scheduled_at,sent_at,metadata)
select id,'weekly_new_properties','Nuevas propiedades · Semana actual','Nuevas oportunidades para tu empresa','sent',1200,null,now()-interval '2 days','{}' from sites where slug='area-prime'
union all select id,'monthly_properties','Catálogo mensual','Propiedades disponibles este mes','scheduled',840,now()+interval '3 days',null,'{}' from sites where slug='area-retail'
union all select id,'monthly_blog','Novedades del mes','Noticias del mercado','draft',0,null,null,'{}' from sites where slug='area-hub';

insert into sync_logs(site_id,provider,operation,status,started_at,finished_at,items_received,items_created)
select id,'wordpress','sync-blog-posts','success',now()-interval '2 hours',now()-interval '119 minutes',5,5 from sites;
