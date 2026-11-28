/** Creator-supplied Vimeo introduction, directly below the hero description. */
export function HomeIntroVideo() {
  return (
    <section id="interface-video" className="hm-intro-video" aria-label="Anatomia Aperta video introduction">
      <div className="hm-intro-video-player">
        <iframe
          src="https://player.vimeo.com/video/1238034980?h=012b65dbbe&badge=0&autopause=0&player_id=0&app_id=58479"
          title="Anatomia Aperta 1080"
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
}
