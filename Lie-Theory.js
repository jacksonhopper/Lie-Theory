import { ExponentialCost, FreeCost, LinearCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "lie_theory_JH";
var name = "Lie Theory";
var description = "You are interested in representations of Lie algebras. So you decide to start probing into how big they can get.";
var authors = "Jackson Hopper";
var version = 1;

var currency;
var c1, c2;
var rank, algType;

var init = () => {
    currency = theory.createCurrency();

    ///////////////////
    // Regular Upgrades

    // c1
    {
        let getDesc = (level) => "c_1=" + getC1(level).toString(0);
        let getInfo = (level) => "c_1=" + getC1(level).toString(0);
        c1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(5, Math.log2(2))));
        c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
        c1.getInfo = (amount) => Utils.getMathTo(getInfo(c1.level), getInfo(c1.level + amount));
    }

    // c2
    {
        let getDesc = (level) => "c_2=" + getC2(level).toString(0);
        let getInfo = (level) => "c_2=" + getC2(level).toString(0);
        c2 = theory.createUpgrade(1, currency, new ExponentialCost(5, Math.log2(10)));
        c2.getDescription = (_) => Utils.getMath(getDesc(c2.level));
        c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount));
    }

    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e2);
    theory.createBuyAllUpgrade(1, currency, 1e10);
    theory.createAutoBuyerUpgrade(2, currency, 1e15);

    ///////////////////////
    //// Milestone Upgrades
    theory.setMilestoneCost(new LinearCost(Math.log10(150), 1));

    {
        rank = theory.createMilestoneUpgrade(0, 1);
        rank.description = "Increases rank of Lie algebra";
        rank.info = Localization.getUpgradeIncCustomInfo("n", "1");
        rank.boughtOrRefunded = (_) => 
        { 
            theory.invalidatePrimaryEquation(); 
            updateAvailability(); 
        }
    }

    {
        var getDesc = (_) => algType.level == 0 ? 'Unlock Type B' : 'Unlock Type G';
        algType = theory.createMilestoneUpgrade(1, 2);
        algType.description = getDesc();
        algType.info = getDesc();
        algType.boughtOrRefunded = (_) => 
        {
            theory.invalidatePrimaryEquation(); 
            algType.description = getDesc(); 
            algType.info = getDesc();
        };
    }
    
    updateAvailability();
}

var updateAvailability = () => {
    algType.isAvailable = rank.level > 0;
    c2.isAvailable = rank.level > 0;
}

var tick = (elapsedTime, multiplier) => {
    let dt = BigNumber.from(elapsedTime * multiplier);
    let bonus = theory.publicationMultiplier;
    currency.value += dt * bonus * getDimVLambda(getC1(c1.level),getC2(c2.level),rank.level,algType.level);
    theory.invalidateTertiaryEquation();
}

var getPrimaryEquation = () => "\\dot{\\rho} = \\text{dim} V(\\lambda)";
var getSecondaryEquation = () => 
{
    let result = "";

    result += "\\begin{matrix}";
    result += theory.latexSymbol;
    result += "=\\max\\rho,";
    result += "&\\lambda =";
    result += "c_1 \\omega_1";
    if (rank.level > 0) result += "+c_2\\omega_2";
    result += "\\end{matrix}";

    return result;
}
var getTertiaryEquation = () =>
{
    let result = "";
    
    result += "\\begin{matrix}";
    result += "\\text{dim} V(\\lambda) = ";
    result += BigNumber.from(getDimVLambda(getC1(c1.level),getC2(c2.level),rank.level,algType.level)).toString();
    result += ", & \\text{Type }";
    switch(algType.level)
    {
        case 0 : result += "A"; break;
        case 1 : result += "B"; break;
        case 2 : result += "G"; break;
    }
    if (rank.level == 0) result += "_1";
    else result += "_2";
    result += " \\end{matrix}";

    return result;
}

var getPublicationMultiplier = (tau) => tau.pow(0.164) / BigNumber.THREE;
var getPublicationMultiplierFormula = (symbol) => "\\frac{{" + symbol + "}^{0.164}}{3}";
var getTau = () => currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var getC1 = (level) => BigNumber.from(level);
var getC2 = (level) => BigNumber.from(level);

var getDimVLambda = (c1Level,c2Level,rankLevel,algTypeLevel) =>
{
    let dim = 0;

    if (rankLevel == 0) 
    { 
        dim = getDimA1(c1Level);
    }
    else
    {
        switch(algTypeLevel)
        {
            case 0: dim = getDimA2(c1Level,c2Level); break;
            case 1: dim = getDimB2(c1Level,c2Level); break;
            case 2: dim = getDimG2(c1Level,c2Level); break;
        }
    }
    return BigNumber.from(dim);
}
var getDimA1 = (c1Level) =>
{
    var posRoots = [[1]];
    var wLambda = [c1Level];
    var wRhoLambda = [];
    for (let i = 0; i < wLambda.length; i++)
    {
        wRhoLambda[i] = wLambda[i] + 1;
    }

    var numerator = 1;
    var denominator = 1;
    for (let i = 0; i < posRoots.length; i++)
        {
            var alpha = posRoots[i];

            var numFact = 0;
            var denomFact = 0;
            for (let j = 0; j < alpha.length; j++) 
            {
                numFact += wRhoLambda[j]*alpha[j];
                denomFact += alpha[j];
            }
            numerator *= numFact;
            denominator *= denomFact;
        };

    var dim = BigNumber.from(numerator/denominator);

    return dim;
}
var getDimA2 = (c1Level,c2Level) =>
{
    var posRoots = [[1,0],[0,1],[1,1]];
    var wLambda = [c1Level,c2Level];
    var wRhoLambda = [];
    for (let i = 0; i < wLambda.length; i++)
    {
        wRhoLambda[i] = 1+wLambda[i];
    }

    var numerator = 1;
    var denominator = 1;
    for (let i = 0; i < posRoots.length; i++)
        {
            var alpha = posRoots[i];

            var numFact = 0;
            var denomFact = 0;
            for (let j = 0; j < alpha.length; j++) 
            {
                numFact += wRhoLambda[j]*alpha[j];
                denomFact += alpha[j];
            }
            numerator *= numFact;
            denominator *= denomFact;
        };

    var dim = BigNumber.from(numerator);
    // var dim = BigNumber.from(numerator/denominator);

    return dim;
}
var getDimB2 = (c1Level,c2Level) =>
{
    var posRoots = [[1,0],[0,1],[1,1],[2,1]];
    var wLambda = [c1Level,c2Level];
    var wRhoLambda = [];
    for (let i = 0; i < wLambda.length; i++)
    {
        wRhoLambda[i]=1+wLambda[i];
    }

    var numerator = 1;
    var denominator = 1;
    for (let i = 0; i < posRoots.length; i++)
        {
            var alpha = posRoots[i];

            var numFact = 0;
            var denomFact = 0;
            for (let j = 0; j < alpha.length; j++) 
            {
                numFact += wRhoLambda[j]*alpha[j];
                denomFact += alpha[j];
            }
            numerator *= numFact;
            denominator *= denomFact;
        };

    var dim = BigNumber.from(numerator/denominator);

    return dim;
}
var getDimG2 = (c1Level,c2Level) =>
{
    var posRoots = [[1,0],[0,1],[1,1],[2,1],[3,1],[3,2]];
    var wLambda = [c1Level,c2Level];
    var wRhoLambda = [];
    for (let i = 0; i < wLambda.length; i++)
    {
        wRhoLambda[i] = 1 + wLambda[i];
    }

    var numerator = 1;
    var denominator = 1;
    for (let i = 0; i < posRoots.length; i++)
        {
            var alpha = posRoots[i];

            var numFact = 0;
            var denomFact = 0;
            for (let j = 0; j < alpha.length; j++) 
            {
                numFact += wRhoLambda[j]*alpha[j];
                denomFact += alpha[j];
            }
            numerator *= numFact;
            denominator *= denomFact;
        };

    var dim = BigNumber.from(numerator/denominator);

    return dim;
}

init();