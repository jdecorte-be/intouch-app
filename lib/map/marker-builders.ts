import { MARKER_BORDER_OPACITY } from './constants';

// Pure helpers that cluster nearby events and build the DOM for map pins.
// They read `activeCategory` from the shared script state but never touch the
// Mapbox map itself.
export const markerBuildersScript = `      // Marker building -----------------------------------------------------
      //
      // Event/group pins are plain DOM elements (a Mapbox Marker with a
      // custom HTML element) rather than GL circle/symbol layers. That keeps
      // emoji rendering crisp (GL's SDF glyphs don't cover most emoji code
      // points) and lets pins carry real CSS transitions for press/pop
      // feedback and cluster "stacking" instead of feature-state hacks.

      function formatCount(value) {
        return value > 99 ? '99+' : String(value);
      }

      function hexToRgba(hex, opacity) {
        const value = hex.replace('#', '');

        if (value.length !== 6) {
          return hex;
        }

        const red = parseInt(value.slice(0, 2), 16);
        const green = parseInt(value.slice(2, 4), 16);
        const blue = parseInt(value.slice(4, 6), 16);

        return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + opacity + ')';
      }

      function getMapPinZIndex(event) {
        return event.kind === 'group' ? 20 : 10;
      }

      // Greedy proximity clustering: each point joins the first existing
      // cluster within range of its running centroid, else starts a new one.
      function clusterPoints(items, getPoint, isNear, canJoinCluster) {
        const clusters = [];

        for (const item of items) {
          const point = getPoint(item);
          const target = clusters.find(
            (cluster) => canJoinCluster(item, cluster.items) && isNear(cluster.anchor, point)
          );

          if (target) {
            target.items.push(item);
            target.sumX += point.x;
            target.sumY += point.y;
            target.anchor = {
              x: target.sumX / target.items.length,
              y: target.sumY / target.items.length,
            };
          } else {
            clusters.push({ items: [item], anchor: point, sumX: point.x, sumY: point.y });
          }
        }

        return clusters.map((cluster) => cluster.items);
      }

      function clusterCenter(cluster, displayCoordinates) {
        const points = cluster.map((event) => displayCoordinates.get(event.id) || event.coordinates);
        const lng = points.reduce((sum, point) => sum + point[0], 0) / points.length;
        const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;

        return [lng, lat];
      }

      // Buckets events by (near-)identical coordinates and, for any bucket
      // with more than one member, fans them out evenly around the shared
      // point by a few meters so duplicate pins (same venue) separate once
      // you zoom in, the same way any two distinct-but-close pins would.
      const DUPLICATE_COORDINATE_PRECISION = 5;
      const JITTER_BASE_RADIUS_METERS = 20;
      const JITTER_RADIUS_PER_POINT_METERS = 5;
      const METERS_PER_DEGREE_LAT = 111320;

      function spreadCoincidentCoordinates(events) {
        const groups = new Map();

        for (const event of events) {
          const lng = event.coordinates[0];
          const lat = event.coordinates[1];
          const key = lng.toFixed(DUPLICATE_COORDINATE_PRECISION) + ',' + lat.toFixed(DUPLICATE_COORDINATE_PRECISION);
          const group = groups.get(key);

          if (group) {
            group.push(event);
          } else {
            groups.set(key, [event]);
          }
        }

        const displayCoordinates = new Map();

        for (const group of groups.values()) {
          if (group.length === 1) {
            displayCoordinates.set(group[0].id, group[0].coordinates);
            continue;
          }

          const lng = group[0].coordinates[0];
          const lat = group[0].coordinates[1];
          const radiusMeters = JITTER_BASE_RADIUS_METERS + JITTER_RADIUS_PER_POINT_METERS * group.length;
          const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);

          group.forEach((event, index) => {
            const angle = (2 * Math.PI * index) / group.length;
            const dLat = (radiusMeters * Math.sin(angle)) / METERS_PER_DEGREE_LAT;
            const dLng = metersPerDegreeLng ? (radiusMeters * Math.cos(angle)) / metersPerDegreeLng : 0;
            displayCoordinates.set(event.id, [lng + dLng, lat + dLat]);
          });
        }

        return displayCoordinates;
      }

      // Starts a pin at \`offset\` pixels away from its real (already-set)
      // position and animates it inward to translate(0, 0), the "fly apart
      // from the old cluster point" effect for a marker that just split out
      // on its own.
      function animateMarkerSplit(element, offset) {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }

        element.style.transition = 'none';
        element.style.transform = 'translate(' + offset.dx + 'px, ' + offset.dy + 'px)';

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            element.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
            element.style.transform = 'translate(0, 0)';
          });
        });

        element.addEventListener(
          'transitionend',
          () => {
            element.style.transition = '';
            element.style.transform = '';
          },
          { once: true }
        );
      }

      function buildMemberBadge(event) {
        const badge = document.createElement('span');
        badge.setAttribute('aria-hidden', 'true');
        badge.className = 'event-pin-badge';
        badge.textContent = formatCount(event.going);

        return badge;
      }

      function buildEventMarkerElement(event, isNew, splitOffset) {
        const isGroup = event.kind === 'group';
        // Mapbox writes its own inline \`transform\` (for lng/lat
        // positioning) directly onto the element handed to it, which would
        // clobber the CSS transform our press/pop states rely on. Give
        // Mapbox a plain wrapper and keep the animated styles on the button.
        const markerRoot = document.createElement('div');
        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        markerElement.setAttribute('aria-label', (isGroup ? 'Group: ' : 'Event: ') + event.title);
        // A pin freshly split out of a cluster gets the fly-apart animation
        // instead of the plain pop, so the two don't fight each other.
        const usePop = isNew && !splitOffset;
        // Only groups can reach here outside the active category (events
        // outside it are filtered out of eventsToRender entirely), so dim
        // just the ones that don't match instead of hiding them.
        const isDimmed = isGroup && activeCategory !== 'featured' && event.category !== activeCategory;
        markerElement.className =
          'event-map-marker ' +
          (isGroup ? 'event-pin-group' : 'event-pin') +
          (usePop ? ' event-marker-pop' : '') +
          (isDimmed ? ' event-marker-dimmed' : '');

        if (splitOffset) {
          animateMarkerSplit(markerElement, splitOffset);
        }

        if (isGroup) {
          // Groups carry a lighter, more vibrant take on their category
          // color on the border; events stay on the uniform theme-purple
          // border set by .event-pin in CSS.
          markerElement.style.borderColor = hexToRgba(event.accentLight, ${MARKER_BORDER_OPACITY});
          markerElement.style.backgroundColor = event.accent + '26';
          markerElement.textContent = event.icon;
          markerElement.append(buildMemberBadge(event));
        } else {
          markerElement.style.backgroundImage = 'url("' + event.photoUrl + '")';
        }

        markerElement.addEventListener('click', () => selectEvent(event.id));
        markerRoot.append(markerElement);

        return markerRoot;
      }

      function buildClusterMarkerElement(cluster, onClusterClick, isNew) {
        const primary = cluster.find((event) => event.kind === 'event') || cluster[0];
        const isGroup = primary.kind === 'group';
        const clusterLabel = isGroup ? 'groups' : 'events';

        // Mapbox writes its own inline \`transform\` directly onto
        // markerRoot, which would clobber a CSS transform animation applied
        // to that same element. Keep the pop-in animation on an inner
        // wrapper instead.
        const markerRoot = document.createElement('div');
        markerRoot.className = 'event-cluster';

        const innerWrap = document.createElement('div');
        innerWrap.className = 'event-cluster-inner' + (isNew ? ' event-marker-pop' : '');
        markerRoot.append(innerWrap);

        // Two offset "ghost" cards behind the primary pin sell the stacked
        // look.
        const shadowBack = document.createElement('div');
        shadowBack.className =
          'event-cluster-shadow event-cluster-shadow-back ' + (isGroup ? 'event-pin-group' : 'event-pin');
        innerWrap.append(shadowBack);

        const shadowMid = document.createElement('div');
        shadowMid.className =
          'event-cluster-shadow event-cluster-shadow-mid ' + (isGroup ? 'event-pin-group' : 'event-pin');
        innerWrap.append(shadowMid);

        // Event clusters are always pure-category by the time they get here
        // (non-matching events are filtered out of eventsToRender), but a
        // group cluster can still mix categories, dim it only if none of
        // its members match the active one.
        const isDimmed =
          isGroup &&
          activeCategory !== 'featured' &&
          cluster.every((clusterEvent) => clusterEvent.category !== activeCategory);

        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        markerElement.setAttribute('aria-label', cluster.length + ' ' + clusterLabel + ' nearby, tap to zoom in');
        markerElement.className =
          'event-map-marker ' + (isGroup ? 'event-pin-group' : 'event-pin') + (isDimmed ? ' event-marker-dimmed' : '');

        if (isGroup) {
          markerElement.style.borderColor = hexToRgba(primary.accentLight, ${MARKER_BORDER_OPACITY});
          markerElement.style.backgroundColor = primary.accent + '26';
          markerElement.textContent = primary.icon;
        } else {
          markerElement.style.backgroundImage = 'url("' + primary.photoUrl + '")';
        }

        markerElement.addEventListener('click', onClusterClick);
        innerWrap.append(markerElement);

        return markerRoot;
      }`;
