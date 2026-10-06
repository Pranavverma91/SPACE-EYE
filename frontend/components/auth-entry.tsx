import { ArrowLeft, ArrowUpRight, Check, LockKeyhole, Orbit } from "lucide-react";
import PublicHeader from "./public-header";

export default function AuthEntry({ mode, signInHref, alternateHref }: { mode: "login" | "signup"; signInHref: string; alternateHref: string }) {
  const signup = mode === "signup";
  return <div className="home-page auth-page"><PublicHeader/>
    <main className="auth-layout">
      <section className="auth-story"><div className="eyebrow">YOUR PERSONAL EARTH OBSERVATORY</div><h1>{signup ? <>A whole planet.<br/><em>Your perspective.</em></> : <>Your world.<br/><em>Waiting for you.</em></>}</h1><p>{signup ? "Build an observation archive around the places you care about." : "Return to your locations, satellite imagery, and saved observations."}</p><ul><li><Check/>Real satellite captures with acquisition dates</li><li><Check/>Crop, water, and forest observation tools</li><li><Check/>Your own saved images and reports</li></ul><div className="auth-story-source"><Orbit size={18}/>SPACE EYE / A NEW PERSPECTIVE</div></section>
      <section className="auth-card" aria-labelledby="auth-heading"><a className="auth-back" href="/"><ArrowLeft size={15}/>Back to overview</a><span className="auth-symbol"><LockKeyhole size={27}/></span><span className="eyebrow">{signup ? "YOUR FIRST OBSERVATION STARTS HERE" : "WELCOME BACK"}</span><h2 id="auth-heading">{signup ? "Create your workspace" : "Log in to SPACE EYE"}</h2><p>{signup ? "Use your ChatGPT account to create a private SPACE EYE workspace." : "Continue with your ChatGPT account to open your private workspace."}</p><a className="btn btn-lime auth-continue" href={signInHref} target="_top">Continue with ChatGPT<ArrowUpRight size={18}/></a><p className="auth-provider-note">{signup ? "New to ChatGPT? You can create an account during the secure sign-in process." : "Your sign-in is handled securely by ChatGPT."} Your password is never stored by SPACE EYE.</p><div className="auth-switch">{signup ? "Already have an account?" : "New to SPACE EYE?"} <a href={alternateHref}>{signup ? "Log in" : "Sign up"}</a></div></section>
    </main><footer className="public-footer"><a href="/">SPACE EYE</a><span><LockKeyhole size={14}/>Your observations stay in your account.</span></footer>
  </div>;
}
