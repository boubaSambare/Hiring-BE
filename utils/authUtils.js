import passport from "passport";
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2'
import { UserModel } from '../model';
import dotenv from 'dotenv';
dotenv.config();

/**
 * set and extract in req.user session
 */

passport.serializeUser(UserModel.serializeUser())
passport.deserializeUser(UserModel.deserializeUser())

/**
 * Local stratedy
*/

// passport.use(UserModel.createStrategy()) // This should be the right one since  we are using another entry point divergent from username

passport.use(new LocalStrategy(UserModel.authenticate())) 

/**
 * Jwt strategy
*/
passport.use(new JwtStrategy({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_SECRET }, (jwtPayload, next) => {
    UserModel.findById(jwtPayload._id, (err, user) => {
        if (err) return next(err, null)
        else if (user) return next(null, user)
        else return next(null, false)
    })
}))

/** 
 * 
 * Linkedin strategy
 * 
*/

passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_KEY,
    clientSecret: process.env.LINKEDIN_SECRET,
    callbackURL: "http://localhost:5500/api/auth/linkedin/callback",
    scope: ['r_emailaddress', 'r_liteprofile'],
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const userFromLinkedin = await UserModel.findOne({ email: profile.emails[0].value, linkedinId: profile.id }) || {}
        if (!Object.keys(userFromLinkedin).length) {
            const createUserProfile = await UserModel.create({
                username: `${profile.name.givenName}.${profile.name.familyName}`,
                linkedinId: profile.id,
                firstname: profile.name.givenName,
                surname: profile.name.familyName,
                image: profile.photos[0].value,
                email: profile.emails[0].value,
                isVerified: true,
                refreshtoken: refreshToken
            })

            return done(null, createUserProfile)
        }
        return done(null, userFromLinkedin)

    } catch (error) {
        return done(error) 
    }

}));