// Every word the villa says. Templates take islander objects and return strings, so the same
// beat never reads the same way twice. Tone: warm, witty, a little knowing; the way the group
// chat talks about the show, not the way a tabloid does.
import { pronoun, noun, nounPl, ARCHETYPES } from './cast.js';

const pk = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const n = (p) => p.name;
const pr = (p) => pronoun(p);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const couple = (a, b) => `${n(a)} & ${n(b)}`;
export const shipName = (a, b) => {
  const x = n(a), y = n(b);
  const cut = (s, k) => s.slice(0, Math.max(2, Math.min(s.length - 1, k)));
  return cap(cut(x, Math.ceil(x.length / 2)) + y.slice(Math.floor(y.length / 2)).toLowerCase());
};

// ---------- I've got a text! ----------
export const TEXT_OPENERS = ['I\'ve got a text!', 'I\'VE GOT A TEXT!', 'Guys... I\'ve got a text.', 'Text! Text! Everyone, text!', 'Islanders! I\'ve got a text!'];
export const texts = {
  recoupleWarn: (rng, choosers, dumpG) => pk(rng, [
    `Islanders, tonight there will be a recoupling. The ${nounPl(choosers)} will choose. The ${noun({ gender: dumpG })} not chosen will be dumped from the island immediately. #StepForward #NoSecondChances`,
    `Islanders, get ready for a recoupling tonight. The ${nounPl(choosers)} will choose who they want to couple up with. Anyone left standing alone will be dumped from the island. #DecisionTime #HeartsOnTheLine`,
    `Islanders, tonight the ${nounPl(choosers)} will each choose a ${noun({ gender: dumpG })} to couple up with. One ${noun({ gender: dumpG })} will be left single and leave the villa tonight. #LineUp #NoSafetyNet`,
  ]),
  recoupleSafe: (rng, choosers) => pk(rng, [
    `Islanders, tonight there will be a recoupling. The ${nounPl(choosers)} will choose. Choose wisely. #ShuffleUp #NewBeginnings`,
    `Islanders, please gather at the fire pit tonight. The ${nounPl(choosers)} have a decision to make. #RecouplingNight #TypeOnPaper`,
  ]),
  bombshell: (rng, g, k) => pk(rng, [
    `Islanders, ${k === 1 ? `a new ${noun({ gender: g })} is entering the villa tonight` : `${k} new bombshells are entering the villa tonight`}. Get ready to say hello. #HeadsWillTurn #NewArrival`,
    `Islanders, tonight ${k === 1 ? 'a bombshell' : `${k} bombshells`} will be arriving. Please gather at the fire pit to welcome ${k === 1 ? 'them' : 'them all'}. #IncomingBombshell #HoldOnTight`,
    `Islanders, the villa is about to get a little more crowded. ${k === 1 ? 'A bombshell' : `${k} bombshells`} will be joining you tonight. #NewEnergy #StayLoyal`,
  ]),
  bombshellDates: (rng, b, k) => pk(rng, [
    `${n(b)}, as the newest islander you get to choose ${k} islanders to take on a date this afternoon. Please get ready to leave the villa. #FirstImpressions #TakeYourPick`,
    `${n(b)}, tonight you will go on ${k} dates with islanders of your choosing. Choose well. #DateNight #NewInTown`,
  ]),
  challenge: (rng, title) => pk(rng, [
    `Islanders, it's time to find out who has been paying attention. Please get ready for today's challenge: ${title}. #GameOn #NoHoldingBack`,
    `Islanders, today's challenge is ${title}. Please make your way to the garden. #ChallengeTime #LetsPlay`,
  ]),
  publicVote: (rng) => pk(rng, [
    `Islanders, the public have been voting for their favorite couple. The couples with the fewest votes are at risk of being dumped from the island tonight. #AmericaHasSpoken #FirePit`,
    `Islanders, ${'America'} has been voting. Please gather at the fire pit immediately. #VoteResults #Nervous`,
  ]),
  publicDump: (rng) => pk(rng, [
    `Islanders, the public have voted. The couple with the fewest votes will be dumped from the island tonight. #FinalWord #PackYourBags`,
  ]),
  islandersDecide: (rng, k) => pk(rng, [
    `Islanders, you now have to decide which ${k === 2 ? 'girl and which boy' : 'islander'} from the vulnerable couples will be dumped from the island. #ToughCall #NoEasyWayOut`,
    `Islanders, the vulnerable couples have been revealed. The rest of you must now decide who leaves tonight. #YourChoice #Savage`,
  ]),
  hideaway: (rng, a, b) => pk(rng, [
    `${n(a)} and ${n(b)}, the Hideaway is open tonight. Please get ready and make your way there. #HideawayOpen #AloneAtLast`,
    `${n(a)} and ${n(b)}, the public have chosen you to spend a night in the Hideaway. Enjoy. #KeysToTheHideaway #DontBeLoud`,
  ]),
  casaStart: (rng, leaving) => pk(rng, [
    `${cap(nounPl(leaving))}, please pack a bag. You are leaving the villa for a few days. Don't tell the ${nounPl(leaving === 'f' ? 'm' : 'f')}. #CasaAmor #StickOrTwist`,
    `${cap(nounPl(leaving))}, get ready to leave the villa immediately. Your bags are already packed. #CasaAmor #TheUltimateTest`,
  ]),
  casaArrive: (rng, g, k) => pk(rng, [
    `Islanders, welcome to Casa Amor. ${k} new ${nounPl(g)} are walking in right now. #CasaAmor #NoRules`,
    `Islanders, your time apart begins now. ${k} new ${nounPl(g)} have arrived to keep you company. #CasaAmor #LoyaltyTest`,
  ]),
  postcard: (rng) => pk(rng, [
    `Islanders, you've got a postcard from Casa Amor. #WishYouWereHere #OrDoYou`,
  ]),
  casaRecouple: (rng) => pk(rng, [
    `Islanders, tonight there will be a recoupling. You must decide whether to stick with your current partner or twist and couple up with someone new. #StickOrTwist #MomentOfTruth`,
    `Islanders, Casa Amor is over. Tonight you will face your partner at the fire pit and reveal whether you stuck or twisted. #CasaRecoupling #TheWalk`,
  ]),
  movieNight: (rng) => pk(rng, [
    `Islanders, tonight is Movie Night. Please grab your popcorn and take a seat. The villa has been watching you. #MovieNight #NowShowing`,
    `Islanders, grab a blanket. Tonight's screening features a cast you already know. #MovieNight #NoSkipping`,
  ]),
  dates: (rng, a, b) => pk(rng, [
    `${n(a)} and ${n(b)}, you have been chosen to go on a date. Please get ready to leave the villa. #DateNight #Butterflies`,
    `${n(a)} and ${n(b)}, tonight you will leave the villa for a private date. #Romance #TableForTwo`,
  ]),
  family: (rng) => pk(rng, [
    `Islanders, today you will have some very special visitors. Please get ready for the day. #MeetTheParents #Emotional`,
  ]),
  final: (rng) => pk(rng, [
    `Islanders, tonight is the final. The public have voted. One couple will be crowned the winners. #TheFinal #ItAllComesDownToThis`,
  ]),
  finalVote: (rng) => pk(rng, [
    `Islanders, the public have been voting for their favorite couple. Tonight one couple will be dumped from the island, just days before the final. #SoClose #FinalStretch`,
  ]),
};

// ---------- narrator ----------
export const narrator = {
  arrivals: (rng) => pk(rng, [
    'The sun is out, the pool is glittering, and ten strangers are about to pretend they are not nervous.',
    'Welcome to the villa. Suitcases in the bedroom, sunglasses on, first impressions loading.',
    'A brand-new villa, a brand-new summer, and ten single people who all said they were "not here to play games."',
  ]),
  morning: (rng) => pk(rng, [
    'Morning in the villa. Somebody is already doing sit-ups. Somebody is already debriefing.',
    'The sun comes up over the terrace and last night is immediately discussed in three separate huddles.',
    'Breakfast: eggs, protein shakes, and a full recap of who said what at the fire pit.',
    'A quiet morning. Which in the villa means everybody is talking at once.',
    'The daybeds fill up. So do the group chats that will exist about this in six hours.',
    'Coffee, sunscreen, and one very pointed "can I borrow you for a sec."',
  ]),
  evening: (rng) => pk(rng, [
    'The fairy lights come on and the villa turns into a place where every chat is a Chat.',
    'Night falls. Time for the conversations that people spent all day rehearsing.',
    'Dinner is done, the music is low, and three different people are looking for "a quick word."',
    'The sun goes down and, on schedule, so does someone\'s mood.',
  ]),
  casaMorning: (rng) => pk(rng, [
    'Two villas, two breakfasts, one very loud silence about what happened last night.',
    'Casa Amor, day two. Nobody in either villa has said the word "loyal" fewer than eleven times.',
  ]),
};

// ---------- relationships ----------
export const chat = {
  checkin: (rng, a, b) => pk(rng, [
    `${n(a)} pulls ${n(b)} to the daybeds for a check-in. "Where's your head at?" ${pr(b).They} says "with you." ${pr(a).They} pretends that was not the exact answer ${pr(a).they} wanted.`,
    `${n(a)} and ${n(b)} do the nightly debrief on the swing seat. Somewhere in the middle of it they stop debriefing and just hold hands.`,
    `${n(b)} makes ${n(a)} a tea without asking how ${pr(a).they} takes it, and gets it right. ${n(a)} tells the girls about this for forty minutes.`,
    `${n(a)}: "I just want to know we're on the same page." ${n(b)}: "Same page, same book." It is corny. It works.`,
    `${n(a)} and ${n(b)} sit on the terrace and talk about home. Nothing dramatic happens, which is the most romantic thing that happened all day.`,
    `${n(b)} asks ${n(a)} what ${pr(a).their} mom would think of ${pr(b).them}. ${n(a)} says "she'd love you," a half-second too quickly.`,
  ]),
  graft: (rng, a, b, partner) => pk(rng, [
    `${n(a)} pulls ${n(b)} for a chat by the pool. "I just think there's something here." ${n(b)} laughs, but does not walk away.`,
    `${n(a)} finds ${n(b)} on the terrace and asks how ${pr(b).they} is "actually" doing. It is a long chat. ${partner ? `${n(partner)} clocks it from the kitchen.` : 'The whole garden clocks it.'}`,
    `${n(a)} tells ${n(b)} ${pr(b).they} is ${pr(a).their} type on paper. ${n(b)}: "Everyone says that." ${n(a)}: "I'm saying it right."`,
    `${n(a)} lingers a little too long after handing ${n(b)} a drink. ${n(b)} notices. So does everyone on the daybeds.`,
    `${n(a)} asks ${n(b)} for "five minutes." It becomes twenty-five. ${partner ? `${n(partner)} counts every one of them.` : 'The girls on the balcony count every one of them.'}`,
    `${n(a)}: "If you weren't coupled up, would you be open to getting to know me?" ${n(b)} takes a breath before answering. That breath is the whole episode.`,
  ]),
  flirtOK: (rng, a, b) => pk(rng, [
    `${n(b)} is smiling before ${n(a)} even finishes the sentence.`,
    `${n(b)}: "You're trouble." ${n(a)}: "You like trouble." Nobody denies it.`,
    `The eye contact goes on for a full three seconds. Producers will use all three.`,
    `${n(b)} says "stop," then does not move a single inch away.`,
  ]),
  flirtNo: (rng, a, b) => pk(rng, [
    `${n(b)} gives ${n(a)} a very polite, very final "that's cute."`,
    `${n(b)}: "I'm happy where I am, honestly." ${n(a)} nods like a man who has heard that before.`,
    `${n(b)} laughs, says "you're funny," and immediately goes to find ${pr(b).their} partner.`,
    `${n(b)} thanks ${n(a)} for being honest and then tells four people within the hour.`,
  ]),
  kiss: (rng, a, b, where) => pk(rng, [
    `${n(a)} and ${n(b)} kiss ${where === 'hideaway' ? 'in the Hideaway' : where === 'terrace' ? 'on the terrace' : 'by the pool'}. The girls watching from the balcony make a noise only dogs can hear.`,
    `First kiss for ${n(a)} and ${n(b)}. ${n(a)} walks away pretending to be calm and is not calm.`,
    `${n(b)} goes in for the kiss and ${n(a)} meets ${pr(b).them} halfway. Fairy lights, a slow song, and a cameraman trying very hard to be invisible.`,
    `${n(a)} kisses ${n(b)} mid-sentence. The sentence is never finished. It did not need to be.`,
  ]),
  argument: (rng, a, b) => pk(rng, [
    `${n(a)} pulls ${n(b)} to the fire pit. "I'm not gonna lie, that hurt." ${n(b)} says it wasn't like that. It was a little like that.`,
    `${n(a)}: "You made me look stupid." ${n(b)}: "I didn't make you look anything." The garden goes quiet enough to hear the pool filter.`,
    `${n(a)} and ${n(b)} have The Chat. Voices stay low, hands do not. ${n(a)} walks off to the terrace and the girls arrive within seconds.`,
    `"Can I be honest?" ${n(a)} asks, and ${n(b)} knows what is coming. It comes. It is not pretty. It is fair.`,
    `${n(b)} says "I hear you" four times. ${n(a)} points out that hearing and listening are different words.`,
    `${n(a)}: "Do you even like me or do you just like being coupled up?" ${n(b)} takes too long to answer. That is an answer.`,
  ]),
  makeup: (rng, a, b) => pk(rng, [
    `${n(a)} and ${n(b)} find each other on the swing seat an hour later. "I don't want to fight." "Me neither." A long hug. The girls exhale.`,
    `${n(b)} apologizes properly, no "but." ${n(a)} says "okay" in the voice that means okay. They go to bed a couple.`,
  ]),
  theTalk: (rng, a, b) => pk(rng, [
    `${n(a)} pulls ${n(b)} for the big one. "I think I'm falling for you." ${n(b)}: "I'm already there." The terrace nearly collapses from the girls leaning over it.`,
    `${n(b)} asks ${n(a)} to be exclusive, in the villa, on television, where ${pr(a).they} is already exclusive. ${n(a)} says yes like it was a real question. It was, actually.`,
    `${n(a)} and ${n(b)} decide to close things off. "Just us." Fire pit, fairy lights, somebody crying on a daybed who is not either of them.`,
  ]),
  friends: (rng, a, b) => pk(rng, [
    `${n(a)} and ${n(b)} do a full debrief on the terrace. Every name in the villa is mentioned. Nothing is resolved. It is perfect.`,
    `${n(a)} and ${n(b)} lie on the daybeds and rank everyone's grafting technique. Theirs is not on the list.`,
    `${n(a)} does ${n(b)}'s hair while explaining exactly what ${pr(b).they} should say tonight. ${n(b)} will say none of it.`,
    `${n(a)} and ${n(b)} make pancakes and a plan. The pancakes are better than the plan.`,
    `${n(a)}: "Do you trust ${pr(b).them}?" ${n(b)}: "I trust you." ${n(a)}: "That's not what I asked." Sisterhood, but with follow-up questions.`,
  ]),
  gossip: (rng, a, b, about, target) => pk(rng, [
    `${n(a)} tells ${n(b)} exactly what ${n(about)} said about ${n(target)} on the terrace. Word for word. Plus two words.`,
    `${n(a)} to ${n(b)}: "Don't say anything, but..." ${n(b)} says something. About ${n(about)}. To ${n(target)}. Within the hour.`,
    `${n(a)} "just thinks ${n(target)} deserves to know" what ${n(about)} said. ${n(b)} agrees, which is how it gets to ${n(target)} before dinner.`,
  ]),
  confession: (rng, a, about) => pk(rng, [
    `${n(a)} in the Beach Hut: "I like ${n(about)}. Like, like-like. Don't show ${pr(about).them} this."`,
    `${n(a)}, Beach Hut: "${n(about)}? Yeah. Yeah. I'm in trouble."`,
    `${n(a)} tells the Beach Hut ${pr(a).they} is "keeping an open mind," then talks about ${n(about)} for six uninterrupted minutes.`,
    `${n(a)}: "Am I being crazy? About ${n(about)}? ...Don't answer that."`,
  ]),
  confessionDoubt: (rng, a, partner) => pk(rng, [
    `${n(a)} in the Beach Hut: "I do like ${n(partner)}. I just don't know if I like ${pr(partner).them} enough. Is that bad? That's bad."`,
    `${n(a)}, Beach Hut: "${n(partner)} is lovely. Lovely. Lovely is a word you use about a hotel."`,
    `${n(a)}: "Something's missing with ${n(partner)} and I can't tell if it's ${pr(partner).them} or the villa."`,
  ]),
  date: (rng, a, b, kind) => pk(rng, [
    `${n(a)} and ${n(b)} on a ${kind}. ${n(b)} asks the big questions. ${n(a)} answers the small ones and then, slowly, the big ones too.`,
    `A ${kind} for ${n(a)} and ${n(b)}. Champagne, a view, and ${n(a)} saying "this is so nice" four times, meaning it more each time.`,
    `${n(a)} and ${n(b)} leave the villa for a ${kind}. They come back holding hands, which is noticed by every single person on the daybeds.`,
    `On their ${kind}, ${n(b)} tells ${n(a)} about ${pr(b).their} family. ${n(a)} tears up. ${n(b)} pretends not to see and moves ${pr(b).their} chair closer.`,
  ]),
  bombshellDate: (rng, b, x) => pk(rng, [
    `${n(b)} takes ${n(x)} on a date. Rooftop, cocktails, and ${n(b)} asking "so are you happy in your couple?" before the first sip.`,
    `${n(b)} and ${n(x)}, date one. ${n(b)} is good at this. Uncomfortably good. ${n(x)} laughs more than ${pr(x).they} meant to.`,
    `${n(x)} goes on a date with ${n(b)} "just to be polite" and comes back knowing ${n(b)}'s middle name and star sign.`,
  ]),
  hideaway: (rng, a, b) => pk(rng, [
    `${n(a)} and ${n(b)} get the Hideaway. Rose petals, a bath the size of a small car, and the villa pressing its face against the bedroom window.`,
    `Hideaway night for ${n(a)} and ${n(b)}. What happens in there stays in there, except for the parts they tell everyone at breakfast.`,
  ]),
  hideawayMorning: (rng, a, b) => pk(rng, [
    `${n(a)} and ${n(b)} walk back in the next morning to a round of applause they did not ask for and absolutely enjoy.`,
    `The Hideaway couple return. "How was it?" "Nice." "NICE?" The girls take ${n(a)} to the terrace for the real version.`,
  ]),
};

// ---------- recoupling speeches ----------
export function speech(rng, chooser, chosen, ctx = {}) {
  const A = ARCHETYPES[chooser.arch];
  const g = noun(chosen);
  const base = {
    sweetheart: [`"I want to couple up with this ${g} because ${pr(chosen).they} makes the villa feel like home. ${pr(chosen).They} is kind, ${pr(chosen).they} is patient with me, and I want to give this a real go."`, `"This ${g} has been my calm from day one. I'd like to see where it goes."`],
    bombshell: [`"I want to couple up with this ${g} because from the second I walked in, I knew. And I think ${pr(chosen).they} knew too."`, `"This ${g} is exactly my type. I'm not here to waste time."`],
    gamer: [`"I want to couple up with this ${g} because we have the strongest connection in here, and I think we can go all the way."`, `"This ${g} and I make sense. On every level."`],
    loyal: [`"I want to couple up with this ${g} because I said I would, and I keep my word. ${pr(chosen).They} has my back and I have ${pr(chosen).theirs}."`, `"This ${g}. It was always going to be this ${g}."`],
    wildcard: [`"I want to couple up with this ${g} because... honestly? I have no idea what's about to happen and I love that."`, `"This ${g} makes me nervous in a good way. Let's see."`],
    clown: [`"I want to couple up with this ${g} because ${pr(chosen).they} laughs at my jokes, and that is rare, and medically necessary."`, `"This ${g} is funny, fit, and hasn't told me to shut up yet. Big green flags."`],
    slowburn: [`"I want to couple up with this ${g} because we've taken it slow, and I've realized slow with ${pr(chosen).them} is better than fast with anyone."`, `"This ${g} let me open up at my own pace. That means everything to me."`],
    romantic: [`"I want to couple up with this ${g} because I felt it on day one. I can't explain it. I don't want to."`, `"This ${g} is the reason I came here. I just didn't know it yet."`],
    player: [`"I want to couple up with this ${g} because we've got something real. I know how that sounds. I mean it this time."`, `"This ${g} and I have unfinished business."`],
    peacemaker: [`"I want to couple up with this ${g} because we talk about everything and we never raise our voices. In here, that's rare."`, `"This ${g} is my safe place. I want to be ${pr(chosen).theirs}."`],
    firecracker: [`"I want to couple up with this ${g} because ${pr(chosen).they} can handle me. Not everyone can. Not everyone should try."`, `"This ${g}. Obviously. Sit down."`],
    retriever: [`"I want to couple up with this ${g} because every single day in here has been better because of ${pr(chosen).them}. Every one."`, `"This ${g} is my favorite person here. Sorry, everyone else. Love you though."`],
  }[chooser.arch] || [`"I want to couple up with this ${g} because I think we have something real."`];
  if (ctx.steal) return pk(rng, [
    `"This isn't personal. I want to couple up with this ${g} because I can't ignore what I felt this week, and I'd rather be honest than comfortable."`,
    `"I know this is going to upset someone. I want to couple up with this ${g} because I'd never forgive myself if I didn't try."`,
    ...base,
  ]);
  if (ctx.strategic) return pk(rng, [`"I want to couple up with this ${g} because we're both single and I think we could surprise people."`, `"This ${g} and I get on, and in here, that's a start."`, ...base]);
  return pk(rng, base);
}

// ---------- arrivals, exits ----------
export const arrival = {
  bombshell: (rng, b) => pk(rng, [
    `${n(b)} walks in slowly, sunglasses on, and the villa goes so quiet you can hear the pool. "Hi everyone!" Everyone does not say hi back for a full second.`,
    `${n(b)} arrives at the fire pit, does a lap of hugs, and holds one of them a beat too long. Every partner in the villa notices which one.`,
    `A ${b.age}-year-old ${b.job} from ${b.home}. ${n(b)} says ${pr(b).they} has ${pr(b).their} "eye on a couple of people." ${pr(b).They} says it looking straight at them.`,
    `${n(b)} enters like ${pr(b).they} owns the place. Within four minutes ${pr(b).they} has been asked ${pr(b).their} type. Within five, three people have decided they are it.`,
  ]),
  intro: (rng, p) => `${n(p)}, ${p.age}, ${p.job}, ${p.home}. "${p.bio.quote}"`,
  exitDumped: (rng, p, how) => pk(rng, [
    `${n(p)} hugs everyone twice, cries once, and leaves through the big doors. "${pk(rng, ['No regrets.', 'I came in as me and I\'m leaving as me.', 'Someone in here is lucky and doesn\'t know it yet.', 'I\'ll be watching. Behave.', 'Text me when you\'re out. All of you.'])}"`,
    `${n(p)} packs in twelve minutes and leaves with ${pr(p).their} head high. The villa is quieter without ${pr(p).them}. Some people are relieved. Nobody says so.`,
    `${n(p)}'s exit: one long hug at the fire pit, one look back at the pool, one "be good" that lands on exactly the right person.`,
  ]),
  exitFinal: (rng, p) => `${n(p)} leaves days from the final. "${pk(rng, ['I got what I came for.', 'This is the closest I\'ve ever been to something and I\'m not even sad.', 'Go win it for us.'])}"`,
};

// ---------- casa amor ----------
export const casa = {
  split: (rng, g) => pk(rng, [
    `The ${nounPl(g)} are told to pack. "For a trip." Nobody believes it is a trip. The goodbyes are long and full of promises that will be tested within the hour.`,
    `The ${nounPl(g)} leave through the front door with their bags and the ${nounPl(g === 'f' ? 'm' : 'f')} immediately hold a meeting about what "loyal" means, legally.`,
  ]),
  arrive: (rng, g, k) => pk(rng, [
    `${k} new ${nounPl(g)} walk in and the loyalty speeches from this morning start sounding a lot more theoretical.`,
    `The doors open and ${k} bombshells file in, each one somehow exactly somebody's type. It is almost like they were chosen on purpose.`,
  ]),
  loyalDay: (rng, p, partner) => pk(rng, [
    `${n(p)} wears ${n(partner)}'s ${p.gender === 'f' ? 'hoodie' : 'necklace'} all day and sleeps on the daybed outside. The other villa will never see it. It counts anyway.`,
    `${n(p)} does a full loyalty speech to the new arrivals before they finish saying hello. "Just so we're clear."`,
    `${n(p)} talks about ${n(partner)} so much that a bombshell asks if ${n(partner)} is also in the villa. ${pr(partner).They} is not. ${pr(partner).They} is in ${n(p)}'s head, rent-free.`,
  ]),
  tempted: (rng, p, b, partner) => pk(rng, [
    `${n(p)} says ${pr(p).they} is "just getting to know" ${n(b)}. ${pr(p).They} has been getting to know ${pr(b).them} for three hours on the same daybed.`,
    `${n(b)} asks ${n(p)} about ${n(partner)}. ${n(p)} says "it's early days." It is day fourteen.`,
    `${n(p)} and ${n(b)} share a bed "as friends." The bed is a single.`,
    `${n(p)}, Beach Hut: "${n(b)} is just... easy. Everything with ${n(partner)} is work." Cut to ${n(partner)} in the other villa saying ${n(p)} is "the one."`,
  ]),
  postcard: (rng, lines) => `A postcard arrives from the other villa. ${lines.join(' ')} The room goes silent. Then very, very loud.`,
  postcardLoyal: (rng, p) => `${n(p)}, on the daybed, alone, wearing a hoodie.`,
  postcardKiss: (rng, p, b) => `${n(p)} kissing ${n(b)} in a challenge, or possibly not in a challenge, it is hard to tell from the angle.`,
  postcardCuddle: (rng, p, b) => `${n(p)} and ${n(b)} in a bed. Together. Smiling.`,
  stick: (rng, p, partner) => pk(rng, [
    `${n(p)} walks in alone. "I stuck. It was never a question." Then ${pr(p).they} looks up to see whether ${n(partner)} did the same.`,
    `${n(p)} comes through the doors by ${pr(p).them}self, hands shaking, and says one word: "Stuck."`,
  ]),
  twist: (rng, p, nb, partner) => pk(rng, [
    `${n(p)} walks in with ${n(nb)}. "I'm sorry. I found something I couldn't ignore." The fire pit does not blink.`,
    `The doors open and ${n(p)} is not alone. ${n(nb)} is next to ${pr(p).them}. ${n(partner)}'s face does a thing that will be a GIF by morning.`,
  ]),
  bothStuck: (rng, a, b) => pk(rng, [
    `${n(a)} stuck. ${n(b)} stuck. They run at each other like the end of a film. The fire pit gives the first standing ovation of the season.`,
    `Both stuck. ${n(a)} says "I told you" through tears. ${n(b)} says "I know" through more tears.`,
  ]),
  betrayed: (rng, loyal, twister, nb) => pk(rng, [
    `${n(loyal)} stuck. ${n(twister)} did not. ${n(loyal)} looks at ${n(nb)}, then at ${n(twister)}, then at absolutely nothing. "Cool. Cool cool cool."`,
    `${n(loyal)} walked in alone for a person who walked in with someone else. "You said you didn't need to look." "I didn't look. It found me." "Wow."`,
    `${n(loyal)}: "Did you at least think about me?" ${n(twister)}: "Every day." ${n(loyal)}: "That makes it worse."`,
  ]),
  bothTwisted: (rng, a, b, na, nb) => pk(rng, [
    `${n(a)} walks in with ${n(na)}. ${n(b)} walks in with ${n(nb)}. Four people, one fire pit, zero eye contact. Honestly? Clean.`,
    `Both twisted. ${n(a)} and ${n(b)} look at each other and laugh, the kind of laugh that is mostly relief and a little grief.`,
  ]),
  aftermath: (rng, loyal, twister) => pk(rng, [
    `${n(loyal)} on the terrace after: "I'm not even angry. I'm just... I stayed on a daybed for four nights for that."`,
    `${n(twister)} tries to explain at the fire pit. ${n(loyal)} lets ${pr(twister).them} finish, then says "okay," and walks off. The single most devastating "okay" of the season.`,
  ]),
};

// ---------- movie night ----------
export const movie = {
  intro: (rng) => pk(rng, ['The screen lights up. Popcorn is passed. Nobody is eating it.', 'The islanders sit in rows like a school assembly, except everyone here is about to be in trouble.']),
  clipKiss: (rng, p, b, partner) => `A clip plays: ${n(p)} and ${n(b)} kissing in Casa Amor. ${n(partner)} puts the popcorn down. Slowly.`,
  clipTalk: (rng, p, b, partner) => `Clip: ${n(p)} telling ${n(b)} "there's a spark." ${n(partner)}: "A spark." ${n(p)}: "It was a challenge!" It was not a challenge.`,
  clipLoyal: (rng, p, partner) => `Clip: ${n(p)} on the daybed alone, saying ${n(partner)}'s name to a pillow. The villa: "AWWW." ${n(partner)}: quietly wrecked.`,
  clipGossip: (rng, p, about) => `Clip: ${n(p)} saying ${n(about)} is "a bit much." ${n(about)}: "A bit MUCH?" ${n(p)}: "In a good way!"`,
  reaction: (rng, p) => pk(rng, [
    `${n(p)} defends it for about eight seconds, then stops defending it.`,
    `${n(p)}: "I can explain." Nobody has ever been able to explain.`,
    `${n(p)} laughs. It is not a laughing clip.`,
  ]),
};

// ---------- final ----------
export const finale = {
  declaration: (rng, a, b) => pk(rng, [
    `"${n(b)}, I walked in here thinking I knew what I wanted. Then you asked me how I take my coffee and remembered. Nobody remembers. You remembered."`,
    `"${n(b)}, you saw the worst of me at that fire pit and you stayed. I don't know what this is yet. I know I want to find out with you."`,
    `"${n(b)}, I've never been this nervous in my life and I've been on a first date with a fire eater. You make me want to be brave."`,
    `"${n(b)}, every time I felt like running, you were already holding my hand. I'm done running."`,
  ]),
  reply: (rng, a, b) => pk(rng, [
    `"${n(a)}, I'm not good at this part. So: you're my person. That's the whole speech."`,
    `"${n(a)}, I came for a summer and I found the person I want to tell everything to first. That's you. It's been you since week one."`,
    `"${n(a)}, my mom already loves you. I'm catching up. Quickly."`,
  ]),
  crown: (rng, a, b) => pk(rng, [
    `The host opens the final envelope. "The winners of this season are... ${n(a)} and ${n(b)}!" Confetti, screaming, ${n(a)} folding in half.`,
    `"${n(a)} and ${n(b)}!" The fireworks go off before they finish hugging. ${n(b)} lifts ${n(a)} up and nearly drops ${pr(a).them}. Perfect.`,
  ]),
  split: (rng, a, b) => `Two envelopes. ${n(a)} opens: SPLIT. ${n(b)} opens: SPLIT. $50,000 each, and the kind of relief you can see from space.`,
  steal: (rng, thief, victim) => `Two envelopes. ${n(victim)} opens: SPLIT. ${n(thief)} opens... STEAL. The crowd gasps. ${n(victim)} laughs, because what else. ${n(thief)} takes all $100,000 and a lifetime of being that person.`,
  bothSteal: (rng, a, b) => `Two envelopes. STEAL. STEAL. Nobody gets anything. The audience screams. Honestly, iconic.`,
  runnerUp: (rng, a, b) => pk(rng, [`${couple(a, b)} finish runners-up, holding hands the whole way through the results.`, `Second place for ${couple(a, b)}. They look at each other like they won. Maybe they did.`]),
};

// ---------- fan captions: "what America is saying" ----------
export const captions = {
  kiss: (rng, a, b) => pk(rng, [
    `${shipName(a, b)} is REAL and I will not be taking questions`, `the way ${n(a)} tried to play it cool after that kiss 😭`, `${n(b)} kissing ${n(a)} like the cameras aren't right there >>> 🫶`,
    `not me screaming at my tv over ${couple(a, b)}`, `${couple(a, b)} first kiss and I'm already planning the wedding`, `okay ${n(b)}. okay. we see you 👀`,
  ]),
  graft: (rng, a, b) => pk(rng, [
    `${n(a)} grafting like the rent is due`, `${n(a)} pulling ${n(b)} for a "quick chat" for the third time today 👀`, `${n(a)} said "I'm just being honest" and then was not honest`,
    `the audacity of ${n(a)} rn is actually impressive`, `${n(b)} is too polite to walk away and ${n(a)} knows it`, `${n(a)} needs to sit down and drink some water`,
  ]),
  argument: (rng, a, b) => pk(rng, [
    `${n(a)} said what needed to be said and I'm proud of ${pr(a).them} honestly`, `${n(b)} saying "I hear you" 4 times and hearing nothing 💀`, `protect ${n(a)} at all costs 🫶`,
    `${n(a)} vs ${n(b)} at the fire pit and I've never been more invested`, `${n(b)} really thought that explanation was going to work`, `${n(a)} deserves better and so do we`,
  ]),
  loyal: (rng, a, b) => pk(rng, [
    `${n(a)} being loyal in this villa is honestly a public service`, `if ${n(a)} gets played I'm suing`, `${n(a)} chose ${n(b)} again with a bombshell RIGHT THERE. that's love 😭`,
    `${n(a)} is the only person in that villa with a working conscience`, `${n(a)} loyal and glowing. we love to see it`,
  ]),
  sweet: (rng, a, b) => pk(rng, [
    `${couple(a, b)} making tea for each other is the only content I need`, `${n(b)} remembered how ${n(a)} takes her coffee. men take notes`, `${couple(a, b)} are so calm it's actually suspicious`,
    `the way ${n(b)} looks at ${n(a)} when she's talking 🥹`, `${couple(a, b)} is my Roman Empire`,
  ]),
  bombshell: (rng, b) => pk(rng, [
    `${n(b)} walked in and three relationships ended in spirit`, `the producers knew EXACTLY what they were doing casting ${n(b)}`, `${n(b)} said "I'm not here to step on toes" and then bought steel toe boots`,
    `${n(b)} is going to cause so many problems and I'm ready`, `who let ${n(b)} in here 😭😭`, `${n(b)} has been in the villa 4 minutes and already has a favorite`,
  ]),
  dumped: (rng, p) => pk(rng, [
    `NOT ${n(p)} 😭😭😭 the villa is worse without ${pr(p).them}`, `${n(p)} deserved so much better than this`, `they dumped ${n(p)} and kept THAT? okay.`,
    `${n(p)} leaving with grace while the rest of them can't spell it`, `${n(p)} will be fine, ${pr(p).they} has a brand deal by Tuesday`, `${n(p)} was too good for that villa and I said what I said`,
  ]),
  recouple: (rng, a, b) => pk(rng, [
    `${n(a)} picking ${n(b)}... interesting choice`, `${n(a)} really stood there and said "this ${noun(b)}" like it was obvious. it was not obvious`, `${couple(a, b)} making sense actually`,
    `not ${n(a)} going for the strategic pick 👀`, `${n(b)} being chosen and looking RELIEVED 😭`,
  ]),
  steal: (rng, a, b, ex) => pk(rng, [
    `${n(a)} STOLE ${n(b)} and ${n(ex)}'s face 😳`, `${n(ex)} watching ${n(a)} take ${n(b)} like 🧍`, `${n(a)} said "this isn't personal" and it was extremely personal`,
    `okay ${n(a)} we're going to have to talk about that`, `${n(ex)} single at the fire pit is the saddest thing I've seen all week`,
  ]),
  casaLoyal: (rng, p) => pk(rng, [`${n(p)} on the daybed alone in a hoodie is my hero`, `${n(p)} really said "not today" to six bombshells`, `${n(p)} is what loyalty looks like. take notes`]),
  casaTwist: (rng, p, b) => pk(rng, [`${n(p)} lasted 36 hours 💀`, `${n(p)} was "getting to know" ${n(b)} horizontally`, `${n(p)}?? we trusted you??`, `${n(p)} sharing a bed "as friends" and the bed is a SINGLE`]),
  betrayed: (rng, loyal, twister) => pk(rng, [`${n(loyal)} walking in alone and ${n(twister)} walking in with someone else. I'm sick.`, `${n(loyal)}'s "okay" ended ${n(twister)}'s whole career`, `justice for ${n(loyal)} 😭`, `${n(twister)} you had ONE job`]),
  bothStuck: (rng, a, b) => pk(rng, [`${couple(a, b)} BOTH STUCK I'M CRYING`, `${couple(a, b)} running at each other >>>>>>`, `finally a couple with sense`]),
  challengeFunny: (rng, p) => pk(rng, [`${n(p)} in that challenge was the funniest thing on tv this year`, `${n(p)} has zero shame and I respect it`, `whoever made ${n(p)} do that deserves a raise`]),
  heartRate: (rng, p, x, partner) => pk(rng, [`${n(p)}'s heart rate going up for ${n(x)} and not ${n(partner)}... 👀`, `the heart rate challenge exposing ${n(p)} in 4K`, `${n(partner)} finding out from a HEART MONITOR 😭`]),
  pie: (rng, p, x) => pk(rng, [`${n(p)} pied ${n(x)} with her whole chest`, `${n(x)} taking that pie like it was personal. because it was`, `${n(p)} choosing violence today`]),
  movie: (rng, p) => pk(rng, [`movie night ending ${n(p)}'s whole storyline`, `${n(p)} watching that clip like it wasn't them`, `the producers held that clip for a WEEK. evil. love it.`]),
  win: (rng, a, b) => pk(rng, [`${couple(a, b)} WON I'm in tears`, `the right couple won for once`, `${n(a)} deserved this more than anyone`, `${shipName(a, b)} forever 🏆`]),
  generic: (rng, p) => pk(rng, [
    `${n(p)} is carrying this season on ${pr(p).their} back`, `someone check on ${n(p)} in the Beach Hut`, `${n(p)}'s facial expressions are a whole show`, `${n(p)} saying "I'm not gonna lie" before every lie`,
    `${n(p)} is my villain of the season and I love ${pr(p).them} for it`, `${n(p)} in that outfit tonight 🔥`, `${n(p)} needs to be protected at all costs`, `${n(p)} is playing a game nobody else knows is happening`,
    `the way ${n(p)} said "cool" 😭`, `${n(p)} is either a genius or has no idea what's going on. no in between`,
  ]),
  girls: (rng) => pk(rng, ['the girls linking arms at the fire pit >>>> any couple this season', 'the girls\' terrace debriefs are the real show', 'girls supporting girls 🫶 the men could never', 'the girls have a group chat and it is NOT for the boys']),
  boys: (rng) => pk(rng, ['the boys "supporting each other" by saying "bro" 40 times', 'the boys holding a meeting at the gym about feelings 😭', 'the boys\' debrief is just nodding']),
  text: (rng) => pk(rng, ['"I\'VE GOT A TEXT" still makes my heart drop', 'the way everyone sprints when someone gets a text', 'a text at THIS hour? producers are evil']),
};

// ---------- awards ----------
export const AWARDS = [
  { id: 'villain', label: 'Villain of the Season', emoji: '😈' }, { id: 'sweetheart', label: 'Sweetheart of the Season', emoji: '🍯' },
  { id: 'loyal', label: 'Most Loyal', emoji: '🔒' }, { id: 'graft', label: 'Biggest Grafter', emoji: '💪' }, { id: 'funny', label: 'Funniest Islander', emoji: '😂' },
  { id: 'bombshell', label: 'Best Bombshell', emoji: '💣' }, { id: 'robbed', label: 'Most Robbed', emoji: '🥲' }, { id: 'kisses', label: 'Most Kisses', emoji: '💋' },
];

export const DATE_KINDS = ['rooftop dinner', 'sunset boat trip', 'picnic in the vineyard', 'hot air balloon ride', 'private beach dinner', 'yacht day', 'cooking class', 'candlelit dinner in the garden', 'horseback ride at sunset', 'sunrise breakfast on the cliffs'];
export const CHALLENGE_NAMES = { heartRate: 'Heart Rate', snogMarryPie: 'Kiss, Marry, Pie', babies: 'Baby Daddies & Mamas', talent: 'Villa\'s Got Talent', newsroom: 'The Villa Newsroom', sportsDay: 'Sports Day', truth: 'Spill the Tea', baggage: 'Excess Baggage' };
