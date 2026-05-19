#!/usr/bin/env bash
set -euo pipefail

DB_SERVICE="${DB_SERVICE:-db}"
OUT="${1:-deploy/imports/glampings-rf-draft-import-$(date +%Y%m%d-%H%M%S).sql}"

mkdir -p "$(dirname "$OUT")"

psql_in_db() {
  docker compose exec -T "$DB_SERVICE" sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

copy_query() {
  local table="$1"
  local columns="$2"
  local query="$3"

  {
    printf 'COPY %s (%s) FROM stdin;\n' "$table" "$columns"
    printf "COPY (%s) TO STDOUT WITH (FORMAT text, DELIMITER E'\\t', NULL '\\N');\n" "$query" | psql_in_db
    printf '\\.\n\n'
  } >> "$OUT"
}

cat > "$OUT" <<'SQL'
-- OnlyGlamps glampings-rf draft import bundle.
-- Generated from a local database. Apply with scripts/import-glampings-rf-dump.sh.
-- Safety rule: existing Published objects with matching SourceUrl are skipped.

BEGIN;

CREATE TEMP TABLE og_import_regions (
  slug text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz
);

CREATE TEMP TABLE og_import_cities (
  region_slug text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  is_city boolean NOT NULL,
  created_at timestamptz,
  PRIMARY KEY (region_slug, slug)
);

CREATE TEMP TABLE og_import_object_types (
  slug text PRIMARY KEY,
  name text NOT NULL,
  icon text,
  color_from text,
  color_to text,
  disabled_builtin_fields text,
  created_at timestamptz
);

CREATE TEMP TABLE og_import_amenities (
  slug text PRIMARY KEY,
  name text NOT NULL,
  icon text,
  created_at timestamptz
);

CREATE TEMP TABLE og_import_objects (
  source_url text PRIMARY KEY,
  source_name text,
  source_type text,
  object_type_slug text NOT NULL,
  region_slug text NOT NULL,
  city_slug text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  short_description text,
  full_description text,
  area numeric(10,2),
  capacity integer NOT NULL,
  beds integer,
  rooms integer,
  is_whole boolean NOT NULL,
  min_rental_days integer,
  max_rental_days integer,
  address text,
  settlement text,
  latitude double precision,
  longitude double precision,
  check_in_time text,
  check_out_time text,
  children_allowed boolean NOT NULL,
  pets_allowed boolean NOT NULL,
  smoking_allowed boolean NOT NULL,
  events_allowed boolean NOT NULL,
  deposit text,
  rules text,
  seo_title text,
  seo_description text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TEMP TABLE og_import_photos (
  source_url text NOT NULL,
  url text NOT NULL,
  alt text,
  sort_order integer NOT NULL,
  created_at timestamptz
);

CREATE TEMP TABLE og_import_tariffs (
  source_url text NOT NULL,
  name text NOT NULL,
  price numeric(12,2) NOT NULL,
  description text,
  is_active boolean NOT NULL,
  created_at timestamptz
);

CREATE TEMP TABLE og_import_object_amenities (
  source_url text NOT NULL,
  amenity_slug text NOT NULL,
  PRIMARY KEY (source_url, amenity_slug)
);

SQL

copy_query "og_import_regions" "slug, name, created_at" \
  'SELECT DISTINCT r."Slug", r."Name", r."CreatedAt"
   FROM "SourceLinks" sl
   JOIN "GlampingObjects" o ON o."Id" = sl."ObjectId"
   JOIN "Regions" r ON r."Id" = o."RegionId"
   WHERE sl."SourceName" = $$глэмпинги.рф$$
   ORDER BY r."Slug"'

copy_query "og_import_cities" "region_slug, slug, name, is_city, created_at" \
  'SELECT DISTINCT r."Slug", c."Slug", c."Name", c."IsCity", c."CreatedAt"
   FROM "SourceLinks" sl
   JOIN "GlampingObjects" o ON o."Id" = sl."ObjectId"
   JOIN "Regions" r ON r."Id" = o."RegionId"
   JOIN "CitiesAndDistricts" c ON c."Id" = o."CityOrDistrictId"
   WHERE sl."SourceName" = $$глэмпинги.рф$$
   ORDER BY r."Slug", c."Slug"'

copy_query "og_import_object_types" "slug, name, icon, color_from, color_to, disabled_builtin_fields, created_at" \
  'SELECT DISTINCT t."Slug", t."Name", t."Icon", t."ColorFrom", t."ColorTo", t."DisabledBuiltinFields", t."CreatedAt"
   FROM "SourceLinks" sl
   JOIN "GlampingObjects" o ON o."Id" = sl."ObjectId"
   JOIN "ObjectTypes" t ON t."Id" = o."ObjectTypeId"
   WHERE sl."SourceName" = $$глэмпинги.рф$$
   ORDER BY t."Slug"'

copy_query "og_import_amenities" "slug, name, icon, created_at" \
  'SELECT DISTINCT a."Slug", a."Name", a."Icon", a."CreatedAt"
   FROM "SourceLinks" sl
   JOIN "ObjectAmenities" oa ON oa."ObjectId" = sl."ObjectId"
   JOIN "Amenities" a ON a."Id" = oa."AmenityId"
   WHERE sl."SourceName" = $$глэмпинги.рф$$
   ORDER BY a."Slug"'

copy_query "og_import_objects" "source_url, source_name, source_type, object_type_slug, region_slug, city_slug, name, slug, short_description, full_description, area, capacity, beds, rooms, is_whole, min_rental_days, max_rental_days, address, settlement, latitude, longitude, check_in_time, check_out_time, children_allowed, pets_allowed, smoking_allowed, events_allowed, deposit, rules, seo_title, seo_description, created_at, updated_at" \
  'SELECT sl."SourceUrl", sl."SourceName", sl."SourceType",
          t."Slug", r."Slug", c."Slug",
          o."Name", o."Slug", o."ShortDescription", o."FullDescription",
          o."Area", o."Capacity", o."Beds", o."Rooms", o."IsWhole",
          o."MinRentalDays", o."MaxRentalDays", o."Address", o."Settlement",
          o."Latitude", o."Longitude", o."CheckInTime", o."CheckOutTime",
          o."ChildrenAllowed", o."PetsAllowed", o."SmokingAllowed", o."EventsAllowed",
          o."Deposit", o."Rules", o."SeoTitle", o."SeoDescription",
          o."CreatedAt", o."UpdatedAt"
   FROM "SourceLinks" sl
   JOIN "GlampingObjects" o ON o."Id" = sl."ObjectId"
   JOIN "ObjectTypes" t ON t."Id" = o."ObjectTypeId"
   JOIN "Regions" r ON r."Id" = o."RegionId"
   JOIN "CitiesAndDistricts" c ON c."Id" = o."CityOrDistrictId"
   WHERE sl."SourceName" = $$глэмпинги.рф$$
   ORDER BY sl."SourceUrl"'

copy_query "og_import_photos" "source_url, url, alt, sort_order, created_at" \
  'SELECT sl."SourceUrl", p."Url", p."Alt", p."SortOrder", p."CreatedAt"
   FROM "SourceLinks" sl
   JOIN "ObjectPhotos" p ON p."ObjectId" = sl."ObjectId"
   WHERE sl."SourceName" = $$глэмпинги.рф$$
   ORDER BY sl."SourceUrl", p."SortOrder", p."Id"'

copy_query "og_import_tariffs" "source_url, name, price, description, is_active, created_at" \
  'SELECT sl."SourceUrl", t."Name", t."Price", t."Description", t."IsActive", t."CreatedAt"
   FROM "SourceLinks" sl
   JOIN "Tariffs" t ON t."ObjectId" = sl."ObjectId"
   WHERE sl."SourceName" = $$глэмпинги.рф$$
   ORDER BY sl."SourceUrl", t."Id"'

copy_query "og_import_object_amenities" "source_url, amenity_slug" \
  'SELECT sl."SourceUrl", a."Slug"
   FROM "SourceLinks" sl
   JOIN "ObjectAmenities" oa ON oa."ObjectId" = sl."ObjectId"
   JOIN "Amenities" a ON a."Id" = oa."AmenityId"
   WHERE sl."SourceName" = $$глэмпинги.рф$$
   ORDER BY sl."SourceUrl", a."Slug"'

cat >> "$OUT" <<'SQL'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM og_import_objects
    GROUP BY source_url
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Dump contains duplicate source_url values';
  END IF;
END $$;

INSERT INTO "Users" ("Email", "Username", "FirstName", "Role", "AuthDate", "CreatedAt", "UpdatedAt")
SELECT 'imported@onlyglamps.local', 'imported', 'Импорт', 'User', now(), now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM "Users" WHERE "Email" = 'imported@onlyglamps.local'
);

INSERT INTO "Regions" ("Name", "Slug", "CreatedAt")
SELECT r.name, r.slug, COALESCE(r.created_at, now())
FROM og_import_regions r
WHERE NOT EXISTS (
  SELECT 1 FROM "Regions" existing WHERE existing."Slug" = r.slug
);

INSERT INTO "CitiesAndDistricts" ("RegionId", "Name", "Slug", "IsCity", "CreatedAt")
SELECT region."Id", c.name, c.slug, c.is_city, COALESCE(c.created_at, now())
FROM og_import_cities c
JOIN "Regions" region ON region."Slug" = c.region_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM "CitiesAndDistricts" existing
  WHERE existing."RegionId" = region."Id" AND existing."Slug" = c.slug
);

INSERT INTO "ObjectTypes" ("Name", "Slug", "Icon", "ColorFrom", "ColorTo", "DisabledBuiltinFields", "CreatedAt")
SELECT t.name, t.slug, t.icon, t.color_from, t.color_to, t.disabled_builtin_fields, COALESCE(t.created_at, now())
FROM og_import_object_types t
WHERE NOT EXISTS (
  SELECT 1 FROM "ObjectTypes" existing WHERE existing."Slug" = t.slug
);

INSERT INTO "Amenities" ("Name", "Slug", "Icon", "CreatedAt")
SELECT a.name, a.slug, a.icon, COALESCE(a.created_at, now())
FROM og_import_amenities a
WHERE NOT EXISTS (
  SELECT 1 FROM "Amenities" existing WHERE existing."Slug" = a.slug
);

CREATE TEMP TABLE og_import_report (
  action text NOT NULL,
  source_url text NOT NULL,
  object_id integer
);

DO $$
DECLARE
  rec record;
  v_object_id integer;
  v_owner_id integer;
  v_object_type_id integer;
  v_region_id integer;
  v_city_id integer;
  v_punycode_url text;
BEGIN
  SELECT "Id" INTO v_owner_id
  FROM "Users"
  WHERE "Email" = 'imported@onlyglamps.local'
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'System import owner was not created';
  END IF;

  FOR rec IN SELECT * FROM og_import_objects ORDER BY source_url LOOP
    v_punycode_url := replace(rec.source_url, 'https://глэмпинги.рф', 'https://xn--c1aaobmgio8j.xn--p1ai');
    v_object_id := NULL;

    SELECT o."Id" INTO v_object_id
    FROM "SourceLinks" sl
    JOIN "GlampingObjects" o ON o."Id" = sl."ObjectId"
    WHERE sl."SourceUrl" IN (rec.source_url, v_punycode_url)
    ORDER BY o."Id"
    LIMIT 1;

    IF v_object_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM "GlampingObjects" WHERE "Id" = v_object_id AND "Status" = 'Published'
    ) THEN
      INSERT INTO og_import_report(action, source_url, object_id)
      VALUES ('skipped_published', rec.source_url, v_object_id);
      CONTINUE;
    END IF;

    SELECT "Id" INTO v_object_type_id FROM "ObjectTypes" WHERE "Slug" = rec.object_type_slug LIMIT 1;
    SELECT "Id" INTO v_region_id FROM "Regions" WHERE "Slug" = rec.region_slug LIMIT 1;
    SELECT c."Id" INTO v_city_id
    FROM "CitiesAndDistricts" c
    JOIN "Regions" r ON r."Id" = c."RegionId"
    WHERE r."Slug" = rec.region_slug AND c."Slug" = rec.city_slug
    LIMIT 1;

    IF v_object_type_id IS NULL OR v_region_id IS NULL OR v_city_id IS NULL THEN
      RAISE EXCEPTION 'Missing reference for %: type %, region %, city %',
        rec.source_url, rec.object_type_slug, rec.region_slug, rec.city_slug;
    END IF;

    IF v_object_id IS NULL THEN
      INSERT INTO "GlampingObjects" (
        "OwnerId", "ObjectTypeId", "RegionId", "CityOrDistrictId",
        "Name", "Slug", "ShortDescription", "FullDescription",
        "Area", "Capacity", "Beds", "Rooms", "IsWhole",
        "MinRentalDays", "MaxRentalDays", "Address", "Settlement",
        "Latitude", "Longitude", "CheckInTime", "CheckOutTime",
        "ChildrenAllowed", "PetsAllowed", "SmokingAllowed", "EventsAllowed",
        "Deposit", "Rules", "Status", "SeoTitle", "SeoDescription",
        "CreatedAt", "UpdatedAt"
      )
      VALUES (
        v_owner_id, v_object_type_id, v_region_id, v_city_id,
        rec.name, rec.slug, rec.short_description, rec.full_description,
        rec.area, rec.capacity, rec.beds, rec.rooms, rec.is_whole,
        rec.min_rental_days, rec.max_rental_days, rec.address, rec.settlement,
        rec.latitude, rec.longitude, rec.check_in_time, rec.check_out_time,
        rec.children_allowed, rec.pets_allowed, rec.smoking_allowed, rec.events_allowed,
        rec.deposit, rec.rules, 'Draft', rec.seo_title, rec.seo_description,
        COALESCE(rec.created_at, now()), COALESCE(rec.updated_at, now())
      )
      RETURNING "Id" INTO v_object_id;

      INSERT INTO "SourceLinks" ("ObjectId", "SourceName", "SourceUrl", "SourceType", "CreatedAt")
      VALUES (v_object_id, rec.source_name, rec.source_url, rec.source_type, now());

      INSERT INTO og_import_report(action, source_url, object_id)
      VALUES ('inserted', rec.source_url, v_object_id);
    ELSE
      UPDATE "GlampingObjects"
      SET
        "ObjectTypeId" = v_object_type_id,
        "RegionId" = v_region_id,
        "CityOrDistrictId" = v_city_id,
        "Name" = rec.name,
        "Slug" = rec.slug,
        "ShortDescription" = rec.short_description,
        "FullDescription" = rec.full_description,
        "Area" = rec.area,
        "Capacity" = rec.capacity,
        "Beds" = rec.beds,
        "Rooms" = rec.rooms,
        "IsWhole" = rec.is_whole,
        "MinRentalDays" = rec.min_rental_days,
        "MaxRentalDays" = rec.max_rental_days,
        "Address" = rec.address,
        "Settlement" = rec.settlement,
        "Latitude" = rec.latitude,
        "Longitude" = rec.longitude,
        "CheckInTime" = rec.check_in_time,
        "CheckOutTime" = rec.check_out_time,
        "ChildrenAllowed" = rec.children_allowed,
        "PetsAllowed" = rec.pets_allowed,
        "SmokingAllowed" = rec.smoking_allowed,
        "EventsAllowed" = rec.events_allowed,
        "Deposit" = rec.deposit,
        "Rules" = rec.rules,
        "SeoTitle" = rec.seo_title,
        "SeoDescription" = rec.seo_description,
        "UpdatedAt" = now()
      WHERE "Id" = v_object_id;

      UPDATE "SourceLinks"
      SET "SourceName" = rec.source_name,
          "SourceUrl" = rec.source_url,
          "SourceType" = rec.source_type
      WHERE "ObjectId" = v_object_id;

      INSERT INTO og_import_report(action, source_url, object_id)
      VALUES ('updated', rec.source_url, v_object_id);
    END IF;
  END LOOP;
END $$;

DELETE FROM "ObjectAmenities" oa
USING og_import_report r
WHERE oa."ObjectId" = r.object_id
  AND r.action IN ('inserted', 'updated');

INSERT INTO "ObjectAmenities" ("ObjectId", "AmenityId")
SELECT r.object_id, a."Id"
FROM og_import_report r
JOIN og_import_object_amenities oa ON oa.source_url = r.source_url
JOIN "Amenities" a ON a."Slug" = oa.amenity_slug
WHERE r.action IN ('inserted', 'updated')
ON CONFLICT DO NOTHING;

DELETE FROM "ObjectPhotos" p
USING og_import_report r
WHERE p."ObjectId" = r.object_id
  AND r.action IN ('inserted', 'updated');

INSERT INTO "ObjectPhotos" ("ObjectId", "Url", "Alt", "SortOrder", "CreatedAt")
SELECT r.object_id, p.url, p.alt, p.sort_order, COALESCE(p.created_at, now())
FROM og_import_report r
JOIN og_import_photos p ON p.source_url = r.source_url
WHERE r.action IN ('inserted', 'updated')
ORDER BY r.object_id, p.sort_order;

DELETE FROM "Tariffs" t
USING og_import_report r
WHERE t."ObjectId" = r.object_id
  AND r.action IN ('inserted', 'updated');

INSERT INTO "Tariffs" ("ObjectId", "Name", "Price", "Description", "IsActive", "CreatedAt")
SELECT r.object_id, t.name, t.price, t.description, t.is_active, COALESCE(t.created_at, now())
FROM og_import_report r
JOIN og_import_tariffs t ON t.source_url = r.source_url
WHERE r.action IN ('inserted', 'updated')
ORDER BY r.object_id;

SELECT action, count(*) AS count
FROM og_import_report
GROUP BY action
ORDER BY action;

COMMIT;
SQL

echo "Created $OUT"
